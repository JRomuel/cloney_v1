import { ShopifyGraphQLClient } from './client';
import { ThemeSettings } from '@/types';
import { ShopifyApiError } from '@/errors';
import { ShopifyIndexJson } from './homepageGenerator';
import { getThemePackager, ThemeFile } from '@/lib/themes/ThemePackager';

interface ThemeCreateResponse {
  themeCreate: {
    theme: {
      id: string;
      name: string;
      role: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

interface ThemeFilesUpsertResponse {
  themeFilesUpsert: {
    upsertedThemeFiles: Array<{
      filename: string;
    }> | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

// Dawn theme source URLs to try (in order of preference)
// Shopify requires a source URL - we'll overwrite with our local files after
const DAWN_THEME_URLS = [
  'https://github.com/Shopify/dawn/archive/refs/heads/main.zip',
  'https://codeload.github.com/Shopify/dawn/zip/refs/heads/main',
  'https://github.com/Shopify/dawn/archive/refs/tags/v15.0.0.zip',
  'https://github.com/Shopify/dawn/archive/refs/tags/v14.0.0.zip',
];

// Mutation to create theme from source URL (required by Shopify)
const THEME_CREATE_MUTATION = `
  mutation themeCreate($name: String!, $source: URL!) {
    themeCreate(name: $name, source: $source) {
      theme {
        id
        name
        role
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Query to check theme processing status
const THEME_QUERY = `
  query GetTheme($id: ID!) {
    theme(id: $id) {
      id
      name
      role
      processing
    }
  }
`;

// Query to read back uploaded files for verification
const THEME_FILE_READ_QUERY = `
  query GetThemeFile($themeId: ID!, $filenames: [String!]!) {
    theme(id: $themeId) {
      files(filenames: $filenames, first: 10) {
        nodes {
          filename
          size
          body {
            ... on OnlineStoreThemeFileBodyText {
              content
            }
          }
        }
      }
    }
  }
`;

interface ThemeQueryResponse {
  theme: {
    id: string;
    name: string;
    role: string;
    processing: boolean;
  } | null;
}

interface ThemeFileReadResponse {
  theme: {
    files: {
      nodes: Array<{
        filename: string;
        size: number;
        body: {
          content?: string;
        } | null;
      }>;
    };
  } | null;
}

/**
 * Wait for a theme to finish processing after creation
 */
async function waitForThemeReady(
  client: ShopifyGraphQLClient,
  themeId: string,
  maxAttempts = 30,
  delayMs = 2000
): Promise<void> {
  console.log(`[Theme] Waiting for theme ${themeId} to finish processing...`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await client.query<ThemeQueryResponse>(THEME_QUERY, { id: themeId });

    if (!response.theme) {
      throw new Error(`Theme ${themeId} not found while waiting for processing`);
    }

    if (!response.theme.processing) {
      console.log(`[Theme] Theme is ready after ${attempt + 1} attempt(s)`);
      return;
    }

    console.log(`[Theme] Theme still processing, attempt ${attempt + 1}/${maxAttempts}`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error(`Theme creation timed out - still processing after ${maxAttempts} attempts (${maxAttempts * delayMs / 1000}s)`);
}

/**
 * Verify a file was successfully uploaded to the theme
 */
async function verifyFileUploaded(
  client: ShopifyGraphQLClient,
  themeId: string,
  filename: string
): Promise<boolean> {
  try {
    const response = await client.query<ThemeFileReadResponse>(THEME_FILE_READ_QUERY, {
      themeId,
      filenames: [filename]
    });

    const file = response.theme?.files?.nodes?.[0];
    if (file && file.size > 0) {
      console.log(`[Theme] Verified ${filename} uploaded (${file.size} bytes)`);
      return true;
    }
    console.warn(`[Theme] File ${filename} not found or empty after upload`);
    return false;
  } catch (error) {
    console.error(`[Theme] Error verifying file ${filename}:`, error instanceof Error ? error.message : error);
    return false;
  }
}


const THEME_FILES_UPSERT_MUTATION = `
  mutation themeFilesUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
    themeFilesUpsert(themeId: $themeId, files: $files) {
      upsertedThemeFiles {
        filename
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const THEMES_QUERY = `
  query GetThemes {
    themes(first: 25) {
      edges {
        node {
          id
          name
          role
        }
      }
    }
  }
`;

interface ThemesQueryResponseEdges {
  themes: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        role: string;
      };
    }>;
  };
}

// Batch size for file uploads (Shopify has limits)
const UPLOAD_BATCH_SIZE = 10;

/**
 * Upload theme files in batches to avoid API limits
 */
async function uploadThemeFiles(
  client: ShopifyGraphQLClient,
  themeId: string,
  files: ThemeFile[]
): Promise<{ uploaded: number; failed: string[] }> {
  const failed: string[] = [];
  let uploaded = 0;

  console.log(`[Theme] Uploading ${files.length} files in batches of ${UPLOAD_BATCH_SIZE}...`);

  for (let i = 0; i < files.length; i += UPLOAD_BATCH_SIZE) {
    const batch = files.slice(i, i + UPLOAD_BATCH_SIZE);
    const batchNum = Math.floor(i / UPLOAD_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(files.length / UPLOAD_BATCH_SIZE);

    console.log(`[Theme] Uploading batch ${batchNum}/${totalBatches} (${batch.length} files)...`);

    try {
      const response = await client.mutate<ThemeFilesUpsertResponse>(
        THEME_FILES_UPSERT_MUTATION,
        {
          themeId,
          files: batch.map(f => ({
            filename: f.filename,
            body: {
              type: 'TEXT',
              value: f.content,
            },
          })),
        }
      );

      if (response.themeFilesUpsert.userErrors.length > 0) {
        const errors = response.themeFilesUpsert.userErrors;
        console.warn(`[Theme] Batch ${batchNum} had errors:`, errors);
        // Track failed files
        for (const error of errors) {
          const filename = error.field.join('.');
          failed.push(`${filename}: ${error.message}`);
        }
      }

      const uploadedFiles = response.themeFilesUpsert.upsertedThemeFiles?.length || 0;
      uploaded += uploadedFiles;

      console.log(`[Theme] Batch ${batchNum} complete: ${uploadedFiles} files uploaded`);
    } catch (error) {
      console.error(`[Theme] Batch ${batchNum} failed:`, error);
      // Track all files in failed batch
      for (const file of batch) {
        failed.push(file.filename);
      }
    }

    // Small delay between batches to be nice to the API
    if (i + UPLOAD_BATCH_SIZE < files.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[Theme] Upload complete: ${uploaded}/${files.length} files uploaded`);
  if (failed.length > 0) {
    console.warn(`[Theme] Failed files (${failed.length}):`, failed.slice(0, 10));
  }

  return { uploaded, failed };
}

/**
 * Create a new theme by:
 * 1. Creating a theme from Dawn GitHub URL (required by Shopify API)
 * 2. Waiting for Shopify to process the ZIP
 * 3. Uploading all our local theme files to overwrite the defaults
 *
 * This approach satisfies Shopify's requirement for a source URL while
 * giving us full control over the final theme content.
 */
export async function createTheme(
  client: ShopifyGraphQLClient,
  name: string,
  localThemeId: string = 'dawn'  // Which theme to use from public/themes/
): Promise<{ id: string; name: string }> {
  console.log(`[Theme] Creating theme "${name}" from local theme "${localThemeId}"...`);

  // Step 1: Create theme from Dawn GitHub URL (Shopify requires a source)
  // Try multiple URLs in case one fails
  console.log(`[Theme] Step 1: Creating theme from Dawn source URL...`);

  let theme: { id: string; name: string; role: string } | null = null;
  const errors: string[] = [];

  for (const sourceUrl of DAWN_THEME_URLS) {
    try {
      console.log(`[Theme] Trying source URL: ${sourceUrl}`);

      const createResponse = await client.mutate<ThemeCreateResponse>(
        THEME_CREATE_MUTATION,
        {
          name,
          source: sourceUrl
        }
      );

      if (createResponse.themeCreate.userErrors.length === 0 && createResponse.themeCreate.theme) {
        theme = createResponse.themeCreate.theme;
        console.log(`[Theme] Successfully created theme from: ${sourceUrl}`);
        break;
      }

      const errMsg = createResponse.themeCreate.userErrors.map(e => e.message).join(', ');
      console.warn(`[Theme] URL failed: ${errMsg}`);
      errors.push(`${sourceUrl}: ${errMsg}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[Theme] URL error: ${errMsg}`);
      errors.push(`${sourceUrl}: ${errMsg}`);
    }
  }

  if (!theme) {
    // All URLs failed - try to find an existing theme as fallback
    console.log(`[Theme] All URLs failed, looking for existing theme to use...`);
    const existingTheme = await findDawnLikeTheme(client);

    if (existingTheme) {
      console.log(`[Theme] Using existing theme: ${existingTheme.name}`);
      theme = existingTheme;
    } else {
      // Check if the error was about theme limit
      const isThemeLimitError = errors.some(e => e.includes('20 themes'));
      if (isThemeLimitError) {
        throw new ShopifyApiError(
          `Shop has reached the 20 theme limit. Please delete an unused theme in Shopify Admin ` +
          `(Online Store > Themes) and try again. Alternatively, the import can reuse an existing ` +
          `unpublished theme if one is available.`
        );
      }
      throw new ShopifyApiError(
        `Failed to create theme. Tried URLs: ${errors.join('; ')}. ` +
        `No existing unpublished theme found as fallback.`
      );
    }
  }

  console.log(`[Theme] Theme ready: ${theme.name} (${theme.id})`);

  // Step 1.5: Wait for Shopify to finish processing the GitHub ZIP
  console.log(`[Theme] Waiting for theme to finish processing...`);
  await waitForThemeReady(client, theme.id);

  // Step 2: Load all theme files from our local repository
  console.log(`[Theme] Step 2: Loading theme files from local repository...`);
  const packager = getThemePackager();

  let files: ThemeFile[];
  try {
    files = await packager.getThemeFiles(localThemeId);
    console.log(`[Theme] Loaded ${files.length} files from theme '${localThemeId}'`);

    // Log file summary
    const summary = await packager.getFileSummary(localThemeId);
    console.log(`[Theme] File summary:`, summary);
  } catch (error) {
    console.error(`[Theme] Failed to load theme files:`, error);
    throw new ShopifyApiError(
      `Failed to load theme files from '${localThemeId}': ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Step 3: Upload all our local files to overwrite Dawn defaults
  console.log(`[Theme] Step 3: Uploading ${files.length} local files to overwrite defaults...`);
  const { uploaded, failed } = await uploadThemeFiles(client, theme.id, files);

  if (failed.length > 0) {
    console.warn(`[Theme] Some files failed to upload (${failed.length}/${files.length})`);
    // Continue anyway - some failures might be acceptable
  }

  // Step 4: Verify critical files were uploaded
  console.log(`[Theme] Step 4: Verifying critical files...`);
  const criticalFiles = [
    'layout/theme.liquid',
    'config/settings_schema.json',
    'config/settings_data.json',
  ];

  for (const file of criticalFiles) {
    const verified = await verifyFileUploaded(client, theme.id, file);
    if (!verified) {
      console.error(`[Theme] CRITICAL: File ${file} verification failed!`);
    }
  }

  console.log(`[Theme] Theme creation complete! ${uploaded} files uploaded.`);

  return {
    id: theme.id,
    name: theme.name,
  };
}

/**
 * Check if a theme name indicates it's Dawn-based or Cloney-created
 */
function isDawnLikeTheme(themeName: string): boolean {
  const name = themeName.toLowerCase();
  return name.includes('dawn') || name.includes('cloney');
}

/**
 * Find an existing theme that can be customized
 *
 * Priority:
 * 1. Dawn-like unpublished themes (best match)
 * 2. Any unpublished theme (we'll overwrite with our files anyway)
 * 3. Development themes
 *
 * Since we upload all our local theme files, the base theme doesn't matter much.
 */
async function findDawnLikeTheme(
  client: ShopifyGraphQLClient
): Promise<{ id: string; name: string; role: string } | null> {
  try {
    const response = await client.query<ThemesQueryResponseEdges>(THEMES_QUERY);
    const themes = response.themes.edges.map(e => e.node);

    console.log(`[Theme] Found ${themes.length} themes:`,
      themes.map(t => `${t.name} (${t.role})`).join(', ')
    );

    // Log theme roles for debugging
    const roleCount: Record<string, number> = {};
    themes.forEach(t => {
      roleCount[t.role] = (roleCount[t.role] || 0) + 1;
    });
    console.log(`[Theme] Theme roles:`, roleCount);

    // Get editable themes (never use MAIN/LIVE)
    const editableThemes = themes.filter(t =>
      t.role === 'UNPUBLISHED' || t.role === 'DEVELOPMENT'
    );

    if (editableThemes.length === 0) {
      console.log(`[Theme] No unpublished or development themes found`);
      console.log(`[Theme] All themes:`, themes.map(t => `${t.name} (${t.role})`));
      return null;
    }

    // Priority 1: Dawn-like theme
    const dawnLikeTheme = editableThemes.find(t => isDawnLikeTheme(t.name));
    if (dawnLikeTheme) {
      console.log(`[Theme] Found Dawn-like theme: ${dawnLikeTheme.name}`);
      return dawnLikeTheme;
    }

    // Priority 2: Any unpublished theme (we'll overwrite it with our files)
    const unpublishedTheme = editableThemes.find(t => t.role === 'UNPUBLISHED');
    if (unpublishedTheme) {
      console.log(`[Theme] Using unpublished theme as base: ${unpublishedTheme.name} (will overwrite with local files)`);
      return unpublishedTheme;
    }

    // Priority 3: Development theme
    const devTheme = editableThemes[0];
    console.log(`[Theme] Using development theme as base: ${devTheme.name} (will overwrite with local files)`);
    return devTheme;
  } catch (error) {
    console.error(`[Theme] Error finding themes:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function duplicateTheme(
  client: ShopifyGraphQLClient,
  _sourceThemeId: string,
  newName: string
): Promise<{ id: string; name: string }> {
  return createTheme(client, newName);
}

export async function updateThemeSettings(
  client: ShopifyGraphQLClient,
  themeId: string,
  settings: ThemeSettings
): Promise<void> {
  const settingsData = generateDawnSettingsData(settings);

  const response = await client.mutate<ThemeFilesUpsertResponse>(
    THEME_FILES_UPSERT_MUTATION,
    {
      themeId,
      files: [
        {
          filename: 'config/settings_data.json',
          body: {
            type: 'TEXT',
            value: JSON.stringify(settingsData, null, 2),
          },
        },
      ],
    }
  );

  if (response.themeFilesUpsert.userErrors.length > 0) {
    const errors = response.themeFilesUpsert.userErrors
      .map((e) => e.message)
      .join(', ');
    throw new ShopifyApiError(`Failed to update theme settings: ${errors}`);
  }
}

export async function getMainTheme(
  client: ShopifyGraphQLClient
): Promise<{ id: string; name: string } | null> {
  try {
    const response = await client.query<ThemesQueryResponseEdges>(THEMES_QUERY);
    const themes = response.themes.edges.map(e => e.node);

    const mainTheme = themes.find(
      (theme) => theme.role === 'MAIN' || theme.role === 'LIVE'
    );

    if (mainTheme) {
      return { id: mainTheme.id, name: mainTheme.name };
    }

    return themes.length > 0 ? { id: themes[0].id, name: themes[0].name } : null;
  } catch (error) {
    console.error(`[Theme] Error fetching main theme:`, error);
    return null;
  }
}

function generateDawnSettingsData(settings: ThemeSettings): object {
  return {
    current: {
      color_schemes: {
        'scheme-1': {
          settings: {
            background: settings.colors.background,
            background_gradient: '',
            text: settings.colors.text,
            button: settings.colors.primary,
            button_label: '#ffffff',
            secondary_button_label: settings.colors.primary,
            shadow: settings.colors.text,
          },
        },
        'scheme-2': {
          settings: {
            background: adjustColor(settings.colors.background, -5),
            background_gradient: '',
            text: settings.colors.text,
            button: settings.colors.secondary,
            button_label: '#ffffff',
            secondary_button_label: settings.colors.secondary,
            shadow: settings.colors.text,
          },
        },
        'scheme-3': {
          settings: {
            background: settings.colors.accent,
            background_gradient: '',
            text: '#ffffff',
            button: settings.colors.background,
            button_label: settings.colors.text,
            secondary_button_label: '#ffffff',
            shadow: settings.colors.text,
          },
        },
        'scheme-4': {
          settings: {
            background: settings.colors.text,
            background_gradient: '',
            text: settings.colors.background,
            button: settings.colors.background,
            button_label: settings.colors.text,
            secondary_button_label: settings.colors.background,
            shadow: settings.colors.background,
          },
        },
        'scheme-5': {
          settings: {
            background: settings.colors.background,
            background_gradient: '',
            text: settings.colors.text,
            button: settings.colors.primary,
            button_label: '#ffffff',
            secondary_button_label: settings.colors.primary,
            shadow: settings.colors.text,
          },
        },
      },

      type_header_font: mapToShopifyFont(settings.typography.headingFont),
      type_body_font: mapToShopifyFont(settings.typography.bodyFont),
      heading_scale: 100,
      body_scale: 100,

      page_width: 1200,
      spacing_sections: 0,

      logo_position: settings.layout.headerStyle === 'logo_center'
        ? 'middle-center'
        : 'middle-left',
      menu_type_desktop: 'dropdown',

      show_social_icons: settings.layout.footerStyle !== 'minimal',
      enable_country_selector: false,
      enable_language_selector: false,

      brand_headline: settings.tagline || '',

      social_twitter_link: '',
      social_facebook_link: '',
      social_instagram_link: '',

      cart_type: 'drawer',
      show_vendor: false,
      show_cart_note: false,
      predictive_search_enabled: true,
      predictive_search_show_vendor: false,
      predictive_search_show_price: true,
    },
    presets: {},
  };
}

function mapToShopifyFont(fontName: string): string {
  const fontMap: Record<string, string> = {
    'roboto': 'roboto_n4',
    'open sans': 'open_sans_n4',
    'lato': 'lato_n4',
    'montserrat': 'montserrat_n4',
    'poppins': 'poppins_n4',
    'dm sans': 'dm_sans_n4',
    'work sans': 'work_sans_n4',
    'assistant': 'assistant_n4',
    'inter': 'inter_n4',
    'nunito': 'nunito_n4',
    'raleway': 'raleway_n4',
    'playfair display': 'playfair_display_n4',
    'merriweather': 'merriweather_n4',
  };

  const normalizedName = fontName.toLowerCase().trim();
  return fontMap[normalizedName] || 'assistant_n4';
}

function adjustColor(hexColor: string, percent: number): string {
  const num = parseInt(hexColor.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function generateThemeName(brandName: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${brandName} - Cloney ${timestamp}`;
}

/**
 * Update the homepage template (templates/index.json) for a theme
 *
 * Since we upload the complete theme, this now just overwrites the index.json
 * with the user's customized content.
 */
export async function updateThemeHomepage(
  client: ShopifyGraphQLClient,
  themeId: string,
  homepageJson: ShopifyIndexJson
): Promise<{ verified: boolean }> {
  const jsonString = JSON.stringify(homepageJson, null, 2);
  console.log(`[Theme] Homepage JSON structure:`);
  console.log(`[Theme]   Sections: ${Object.keys(homepageJson.sections).join(', ')}`);
  console.log(`[Theme]   Order: ${homepageJson.order.join(', ')}`);
  console.log(`[Theme]   JSON preview (first 500 chars): ${jsonString.substring(0, 500)}...`);

  console.log(`[Theme] Uploading templates/index.json (${jsonString.length} bytes)...`);
  const response = await client.mutate<ThemeFilesUpsertResponse>(
    THEME_FILES_UPSERT_MUTATION,
    {
      themeId,
      files: [
        {
          filename: 'templates/index.json',
          body: {
            type: 'TEXT',
            value: jsonString,
          },
        },
      ],
    }
  );

  if (response.themeFilesUpsert.userErrors.length > 0) {
    const errors = response.themeFilesUpsert.userErrors
      .map((e) => `${e.field.join('.')}: ${e.message}`)
      .join(', ');
    throw new ShopifyApiError(`Failed to update theme homepage: ${errors}`);
  }

  console.log(`[Theme] Upload mutation successful, verifying file...`);

  const verified = await verifyFileUploaded(client, themeId, 'templates/index.json');

  if (!verified) {
    console.warn(`[Theme] WARNING: templates/index.json verification failed - file may not have been saved correctly`);
  }

  return { verified };
}

// Export for use in other modules
export { findDawnLikeTheme };
