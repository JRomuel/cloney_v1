import { ShopifyGraphQLClient } from './client';
import { ThemeSettings } from '@/types';
import { ShopifyApiError } from '@/errors';

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

// Dawn theme source URLs to try (in order)
const DAWN_THEME_URLS = [
  'https://codeload.github.com/Shopify/dawn/zip/refs/heads/main',
  'https://github.com/Shopify/dawn/archive/refs/heads/main.zip',
];

const THEME_CREATE_MUTATION = `
  mutation themeCreate($source: URL!, $name: String!) {
    themeCreate(source: $source, name: $name) {
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
    themes(first: 10) {
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

export async function createTheme(
  client: ShopifyGraphQLClient,
  name: string
): Promise<{ id: string; name: string }> {
  const errors: string[] = [];

  // Strategy 1: Try creating from Dawn theme URL
  for (const sourceUrl of DAWN_THEME_URLS) {
    try {
      console.log(`[Theme] Attempting to create theme "${name}" from: ${sourceUrl}`);

      const response = await client.mutate<ThemeCreateResponse>(
        THEME_CREATE_MUTATION,
        {
          source: sourceUrl,
          name,
        }
      );

      if (response.themeCreate.userErrors.length === 0 && response.themeCreate.theme) {
        console.log(`[Theme] Successfully created theme from URL`);
        return {
          id: response.themeCreate.theme.id,
          name: response.themeCreate.theme.name,
        };
      }

      const errMsg = response.themeCreate.userErrors.map((e) => e.message).join(', ');
      console.warn(`[Theme] URL creation failed: ${errMsg}`);
      errors.push(errMsg);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[Theme] URL creation error:`, errMsg);
      errors.push(errMsg);
    }
  }

  // Strategy 2: Find an existing unpublished theme to use
  console.log(`[Theme] URL-based creation failed, looking for existing theme to customize`);
  const existingTheme = await findThemeToCustomize(client);

  if (!existingTheme) {
    throw new ShopifyApiError(
      `Cannot create theme: URL-based creation failed (${errors.join('; ')}), and no existing theme found to customize.`
    );
  }

  console.log(`[Theme] Using existing theme: ${existingTheme.name} (${existingTheme.id}) [${existingTheme.role}]`);

  // Return the existing theme - we'll update its settings
  return {
    id: existingTheme.id,
    name: existingTheme.name,
  };
}

async function findThemeToCustomize(
  client: ShopifyGraphQLClient
): Promise<{ id: string; name: string; role: string } | null> {
  try {
    const response = await client.query<ThemesQueryResponseEdges>(THEMES_QUERY);
    const themes = response.themes.edges.map(e => e.node);

    console.log(`[Theme] Found ${themes.length} themes:`,
      themes.map(t => `${t.name} (${t.role})`).join(', ')
    );

    // Priority: 1) UNPUBLISHED theme, 2) DEVELOPMENT theme, 3) MAIN theme (last resort)
    const unpublished = themes.find(t => t.role === 'UNPUBLISHED');
    if (unpublished) {
      console.log(`[Theme] Found unpublished theme to customize`);
      return unpublished;
    }

    const development = themes.find(t => t.role === 'DEVELOPMENT');
    if (development) {
      console.log(`[Theme] Found development theme to customize`);
      return development;
    }

    // Use main theme as last resort (will modify live theme settings!)
    const main = themes.find(t => t.role === 'MAIN' || t.role === 'LIVE');
    if (main) {
      console.warn(`[Theme] WARNING: Using MAIN theme - this will modify your live store's settings!`);
      return main;
    }

    // Any theme at all
    if (themes.length > 0) {
      return themes[0];
    }

    return null;
  } catch (error) {
    console.error(`[Theme] Error finding themes:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function duplicateTheme(
  client: ShopifyGraphQLClient,
  sourceThemeId: string,
  newName: string
): Promise<{ id: string; name: string }> {
  // Note: Shopify GraphQL doesn't have a direct duplicate mutation
  // We create a new theme and will copy settings via file upsert
  return createTheme(client, newName);
}

export async function updateThemeSettings(
  client: ShopifyGraphQLClient,
  themeId: string,
  settings: ThemeSettings
): Promise<void> {
  // Generate settings_data.json content for Dawn theme
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
  // Dawn theme settings structure
  return {
    current: {
      // Color scheme settings
      colors_solid_button_labels: '#ffffff',
      colors_accent_1: settings.colors.accent,
      colors_accent_2: settings.colors.secondary,
      colors_text: settings.colors.text,
      colors_outline_button_labels: settings.colors.primary,
      colors_background_1: settings.colors.background,
      colors_background_2: adjustColor(settings.colors.background, -10),

      // Typography settings
      type_header_font: mapToShopifyFont(settings.typography.headingFont),
      type_body_font: mapToShopifyFont(settings.typography.bodyFont),
      heading_scale: 100,
      body_scale: 100,

      // Layout settings
      page_width: 1200,
      spacing_sections: 0,

      // Header settings
      logo_position: settings.layout.headerStyle === 'logo_center'
        ? 'middle-center'
        : 'middle-left',
      menu_type_desktop: 'dropdown',

      // Footer settings
      show_social_icons: settings.layout.footerStyle !== 'minimal',
      enable_country_selector: false,
      enable_language_selector: false,

      // Brand info
      brand_headline: settings.tagline || '',

      // Social media (empty by default)
      social_twitter_link: '',
      social_facebook_link: '',
      social_instagram_link: '',

      // Other defaults
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
  // Map common font names to Shopify's font system
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
  return fontMap[normalizedName] || 'assistant_n4'; // Default to Assistant
}

function adjustColor(hexColor: string, percent: number): string {
  // Lighten or darken a hex color
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
