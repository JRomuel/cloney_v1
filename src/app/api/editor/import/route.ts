import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createGraphQLClient } from '@/lib/shopify/client';
import { createTheme, updateThemeSettings, generateThemeName } from '@/lib/shopify/theme';
import { createProducts } from '@/lib/shopify/product';
import { decrypt } from '@/lib/utils/encryption';
import { ThemeSettings, GeneratedProduct } from '@/types';
import { StyleSettings, EditableProduct } from '@/types/editor';

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

// POST - Import editor content to Shopify
export async function POST(request: NextRequest) {
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
    const { sessionId } = body;

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

    // Decrypt access token and create client
    const accessToken = decrypt(shopRecord.accessToken);
    const client = createGraphQLClient(shop, accessToken);

    // Generate theme name from brand
    const brandName = homepage?.hero?.title || 'Cloney Store';
    const themeName = generateThemeName(brandName);

    // Create theme (UNPUBLISHED)
    console.log(`[Import] Creating theme: ${themeName}`);
    const theme = await createTheme(client, themeName);

    // Update theme settings
    if (styles) {
      console.log(`[Import] Updating theme settings`);
      const themeSettings = convertStylesToTheme(styles, brandName);
      await updateThemeSettings(client, theme.id, themeSettings);
    }

    // Create products (DRAFT status)
    let productsCreated = 0;
    if (products && products.length > 0) {
      console.log(`[Import] Creating ${products.length} products as drafts`);
      const generatedProducts = convertToGeneratedProducts(products);
      const createdProducts = await createProducts(client, generatedProducts);
      productsCreated = createdProducts.length;

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

    console.log(`[Import] Complete! Theme: ${theme.name}, Products: ${productsCreated}`);

    return NextResponse.json({
      success: true,
      themeId: theme.id,
      themeName: theme.name,
      productsCreated,
    });
  } catch (error) {
    console.error('Error importing to Shopify:', error);

    // Try to reset session status on error
    try {
      const body = await request.json().catch(() => ({}));
      if (body.sessionId) {
        await prisma.editorSession.update({
          where: { id: body.sessionId },
          data: { status: 'editing' },
        });
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to import to Shopify',
      },
      { status: 500 }
    );
  }
}
