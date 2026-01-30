import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createGraphQLClient } from '@/lib/shopify/client';
import { createTheme, updateThemeSettings, updateThemeHomepage, generateThemeName } from '@/lib/shopify/theme';
import { createProducts } from '@/lib/shopify/product';
import { createCollectionWithProducts } from '@/lib/shopify/collection';
import { generateHomepageJson } from '@/lib/shopify/homepageGenerator';
import { decrypt } from '@/lib/utils/encryption';
import { ThemeSettings, GeneratedProduct } from '@/types';
import { StyleSettings, EditableProduct, HomepageContent } from '@/types/editor';
import { enforcePaidPlan } from '@/lib/billing/guards';
import { PlanLimitError } from '@/errors';

// Convert editor styles to theme settings format
function convertStylesToTheme(
  styles: StyleSettings,
  brandName: string
): ThemeSettings {
  return {
    colors: styles.colors,
    typography: styles.typography,
    layout: {
      headerStyle: 'logo_left',
      footerStyle: 'minimal',
    },
    brandName,
  };
}

// Convert editable products to generated product format
function convertToGeneratedProducts(products: EditableProduct[]): GeneratedProduct[] {
  return products.map((p) => ({
    title: p.title,
    description: p.description,
    price: p.price,
    tags: p.tags,
    imageUrl: p.imageUrl,
    vendor: p.vendor,
    productType: 'General',
  }));
}

// Default theme settings when no custom styles are provided
function getDefaultThemeSettings(brandName: string): ThemeSettings {
  return {
    colors: {
      primary: '#121212',
      secondary: '#454545',
      accent: '#4a90d9',
      background: '#ffffff',
      text: '#121212',
    },
    typography: {
      headingFont: 'Assistant',
      bodyFont: 'Assistant',
    },
    layout: {
      headerStyle: 'logo_left',
      footerStyle: 'minimal',
    },
    brandName,
  };
}

// POST - Import editor content to Shopify
export async function POST(request: NextRequest) {
  let sessionId: string | undefined;

  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get editor session
    const editorSession = await prisma.editorSession.findUnique({
      where: { id: sessionId },
      include: {
        generation: {
          include: {
            shop: true,
          },
        },
      },
    });

    if (!editorSession) {
      return NextResponse.json(
        { error: 'Editor session not found' },
        { status: 404 }
      );
    }

    if (editorSession.status === 'imported') {
      return NextResponse.json(
        { error: 'Session has already been imported' },
        { status: 400 }
      );
    }

    // Verify shop access
    const shopRecord = await prisma.shop.findUnique({
      where: { domain: shop },
    });

    if (!shopRecord || shopRecord.uninstalledAt || !shopRecord.accessToken) {
      return NextResponse.json(
        { error: 'Shop not found or not authorized' },
        { status: 403 }
      );
    }

    // Check billing - require paid plan to import
    await enforcePaidPlan(shop);

    // Update session status to importing
    await prisma.editorSession.update({
      where: { id: sessionId },
      data: { status: 'importing' },
    });

    // Parse content
    const homepage = editorSession.homepageContent
      ? JSON.parse(editorSession.homepageContent)
      : null;
    const products = editorSession.productsContent
      ? JSON.parse(editorSession.productsContent)
      : [];
    const styles = editorSession.stylesContent
      ? JSON.parse(editorSession.stylesContent)
      : null;

    console.log(`[Import] Session content loaded:`);
    console.log(`[Import]   - Homepage: ${homepage ? 'yes' : 'no'} (hero title: ${homepage?.hero?.title || 'N/A'})`);
    console.log(`[Import]   - Products: ${products.length}`);
    console.log(`[Import]   - Styles: ${styles ? 'yes' : 'no'}`);

    // Decrypt access token and create client
    const accessToken = decrypt(shopRecord.accessToken);
    const client = createGraphQLClient(shop, accessToken);

    // Generate theme name from brand
    const brandName = homepage?.hero?.title || 'Cloney Store';
    const themeName = generateThemeName(brandName);

    // Get theme ID from request (defaults to 'dawn')
    const themeId = body.themeId || 'dawn';

    // Create theme (UNPUBLISHED)
    console.log(`[Import] Creating theme: ${themeName} (using local theme: ${themeId})`);
    const theme = await createTheme(client, themeName, themeId);

    // Update theme settings (always required for color schemes)
    // Color schemes must be defined for sections to render properly
    console.log(`[Import] Updating theme settings (with color schemes)`);
    const themeSettings = styles
      ? convertStylesToTheme(styles, brandName)
      : getDefaultThemeSettings(brandName);
    await updateThemeSettings(client, theme.id, themeSettings);

    // Create products (DRAFT status) and collection
    let productsCreated = 0;
    let collectionHandle: string | undefined;
    let createdProductIds: string[] = [];

    if (products && products.length > 0) {
      console.log(`[Import] Creating ${products.length} products as drafts`);
      const generatedProducts = convertToGeneratedProducts(products);
      const createdProducts = await createProducts(client, generatedProducts);
      productsCreated = createdProducts.length;
      createdProductIds = createdProducts.map((p) => p.id);

      // Save products to database
      for (const product of createdProducts) {
        const originalProduct = products.find(
          (p: EditableProduct) => p.title === product.title
        );
        await prisma.product.create({
          data: {
            shopId: shopRecord.id,
            generationId: editorSession.generationId,
            shopifyProductId: product.id,
            title: product.title,
            description: originalProduct?.description,
            price: originalProduct?.price || 0,
            tags: originalProduct?.tags?.join(','),
          },
        });
      }

      // Create a collection with all products
      try {
        console.log(`[Import] Creating collection for ${createdProductIds.length} products`);
        const collectionTitle = `${brandName} Collection`;
        const collection = await createCollectionWithProducts(
          client,
          collectionTitle,
          createdProductIds,
          `Products from ${brandName} - Created by Cloney`
        );
        collectionHandle = collection.handle;
        console.log(`[Import] Collection created: ${collection.handle}`);
      } catch (collectionError) {
        // Log warning but continue - products were still created
        console.warn(
          `[Import] Failed to create collection:`,
          collectionError instanceof Error ? collectionError.message : collectionError
        );
      }
    }

    // Generate and upload homepage content (templates/index.json)
    // NOTE: No try-catch here - let errors propagate so users know if homepage upload failed
    // The outer try-catch will handle it and return a proper error response
    let homepageVerified = false;
    if (homepage) {
      console.log(`[Import] Homepage data preview:`, JSON.stringify(homepage, null, 2).substring(0, 500));

      // Validate homepage data has required fields
      if (!homepage.hero?.title) {
        console.warn(`[Import] WARNING: Homepage hero title is missing or empty`);
      }

      console.log(`[Import] Generating homepage JSON`);
      const productsSectionTitle = products.length > 0 ? 'Featured Products' : undefined;
      const homepageJson = generateHomepageJson(
        homepage as HomepageContent,
        collectionHandle,
        productsSectionTitle
      );

      // Log detailed JSON structure for debugging
      console.log(`[Import] Generated homepage JSON:`);
      console.log(`[Import]   - Sections: ${Object.keys(homepageJson.sections).join(', ')}`);
      console.log(`[Import]   - Order: ${homepageJson.order.join(', ')}`);
      console.log(`[Import]   - Full JSON preview (first 1000 chars):`, JSON.stringify(homepageJson, null, 2).substring(0, 1000));

      console.log(`[Import] Uploading homepage with ${homepageJson.order.length} sections to theme ${theme.id}`);
      const { verified } = await updateThemeHomepage(client, theme.id, homepageJson);
      homepageVerified = verified;

      if (!verified) {
        console.error(`[Import] Homepage upload verification FAILED - template may not have been saved`);
        // We don't throw here because the mutation succeeded - just warn loudly
      } else {
        console.log(`[Import] Homepage uploaded and verified successfully`);
      }
    } else {
      console.log(`[Import] No homepage content to upload`);
    }

    // Update session as imported
    await prisma.editorSession.update({
      where: { id: sessionId },
      data: {
        status: 'imported',
        importedThemeId: theme.id,
        importedAt: new Date(),
      },
    });

    // Update generation with theme info
    await prisma.generation.update({
      where: { id: editorSession.generationId },
      data: {
        status: 'completed',
        progress: 100,
        themeId: theme.id,
        themeName: theme.name,
      },
    });

    console.log(`[Import] Complete! Theme: ${theme.name}, Products: ${productsCreated}, Collection: ${collectionHandle || 'none'}, Homepage: ${homepage ? (homepageVerified ? 'verified' : 'uploaded but NOT verified') : 'no'}, Settings: uploaded with color schemes`);

    return NextResponse.json({
      success: true,
      themeId: theme.id,
      themeName: theme.name,
      productsCreated,
      collectionHandle: collectionHandle || null,
      homepageUploaded: !!homepage,
      homepageVerified,
      settingsUploaded: true, // Always uploaded (required for color schemes)
      customStyles: !!styles,
    });
  } catch (error) {
    console.error('Error importing to Shopify:', error);

    // Handle billing errors
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'PLAN_REQUIRED',
          plan: error.plan,
        },
        { status: 402 }
      );
    }

    // Try to reset session status on error
    if (sessionId) {
      try {
        await prisma.editorSession.update({
          where: { id: sessionId },
          data: { status: 'editing' },
        });
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to import to Shopify',
      },
      { status: 500 }
    );
  }
}
