import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get import status for a session
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const editorSession = await prisma.editorSession.findUnique({
      where: { id },
      include: {
        generation: {
          select: {
            id: true,
            status: true,
            themeId: true,
            themeName: true,
            shop: {
              select: {
                domain: true,
              },
            },
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

    // Count products created for this generation
    const productsCount = await prisma.product.count({
      where: { generationId: editorSession.generationId },
    });

    const shopSlug = editorSession.generation.shop.domain.replace(
      '.myshopify.com',
      ''
    );

    return NextResponse.json({
      sessionId: editorSession.id,
      status: editorSession.status,
      importedThemeId: editorSession.importedThemeId,
      importedAt: editorSession.importedAt,
      themeName: editorSession.generation.themeName,
      productsCreated: productsCount,
      shopDomain: editorSession.generation.shop.domain,
      links: editorSession.status === 'imported'
        ? {
            themes: `https://admin.shopify.com/store/${shopSlug}/themes`,
            products: `https://admin.shopify.com/store/${shopSlug}/products`,
            theme: editorSession.importedThemeId
              ? `https://admin.shopify.com/store/${shopSlug}/themes/${editorSession.importedThemeId.replace('gid://shopify/Theme/', '')}`
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching import status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import status' },
      { status: 500 }
    );
  }
}
