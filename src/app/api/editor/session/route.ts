import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  HomepageContent,
  EditableProduct,
  StyleSettings,
  defaultHomepageContent,
  defaultStyleSettings,
} from '@/types/editor';
import { ThemeSettings, GeneratedProduct } from '@/types';

// Convert AI-generated theme settings to editor style settings
function convertThemeToStyles(theme: ThemeSettings): StyleSettings {
  return {
    colors: theme.colors,
    typography: theme.typography,
  };
}

// Convert AI-generated products to editable products
function convertProducts(products: GeneratedProduct[]): EditableProduct[] {
  return products.map((p, index) => ({
    id: `product_${index}_${Date.now()}`,
    title: p.title,
    description: p.description,
    price: p.price,
    tags: p.tags,
    imageUrl: p.imageUrl,
    vendor: p.vendor,
  }));
}

// Build homepage content from scraped data and theme settings
function buildHomepageContent(
  scrapedData: {
    title?: string;
    description?: string;
    images?: Array<{ src: string; alt?: string }>;
    headings?: string[];
  },
  theme: ThemeSettings
): HomepageContent {
  const heroImage = scrapedData.images?.[0]?.src;

  return {
    hero: {
      title: theme.brandName || scrapedData.title || 'Welcome to Our Store',
      subtitle: theme.tagline || scrapedData.description || 'Discover amazing products',
      ctaText: 'Shop Now',
      ctaUrl: '/collections/all',
      backgroundImage: heroImage,
    },
    sections: [],
  };
}

// POST - Create a new editor session from a generation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generationId, selectedThemeId } = body;

    if (!generationId) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      );
    }

    // Find the generation
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      include: { editorSession: true },
    });

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Check if editor session already exists
    if (generation.editorSession) {
      return NextResponse.json({
        id: generation.editorSession.id,
        generationId: generation.id,
        homepage: generation.editorSession.homepageContent
          ? JSON.parse(generation.editorSession.homepageContent)
          : null,
        products: generation.editorSession.productsContent
          ? JSON.parse(generation.editorSession.productsContent)
          : null,
        styles: generation.editorSession.stylesContent
          ? JSON.parse(generation.editorSession.stylesContent)
          : null,
        selectedThemeId: generation.editorSession.selectedThemeId,
        status: generation.editorSession.status,
      });
    }

    // Parse AI response to get theme and products
    let homepage: HomepageContent = defaultHomepageContent;
    let products: EditableProduct[] = [];
    let styles: StyleSettings = defaultStyleSettings;

    if (generation.aiResponse) {
      try {
        const aiData = JSON.parse(generation.aiResponse);

        if (aiData.theme) {
          styles = convertThemeToStyles(aiData.theme);
        }

        if (aiData.products) {
          products = convertProducts(aiData.products);
        }

        // Build homepage from scraped data and theme
        if (generation.scrapedData) {
          const scrapedData = JSON.parse(generation.scrapedData);
          homepage = buildHomepageContent(scrapedData, aiData.theme);
        }
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    // Create editor session
    const editorSession = await prisma.editorSession.create({
      data: {
        generationId,
        homepageContent: JSON.stringify(homepage),
        productsContent: JSON.stringify(products),
        stylesContent: JSON.stringify(styles),
        selectedThemeId: selectedThemeId || 'dawn',
        status: 'editing',
      },
    });

    // Update generation status to editing
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: 'editing' },
    });

    return NextResponse.json({
      id: editorSession.id,
      generationId,
      homepage,
      products,
      styles,
      selectedThemeId: editorSession.selectedThemeId,
      status: 'editing',
    });
  } catch (error) {
    console.error('Error creating editor session:', error);
    return NextResponse.json(
      { error: 'Failed to create editor session' },
      { status: 500 }
    );
  }
}
