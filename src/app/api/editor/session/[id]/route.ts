import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get an editor session by ID
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
            sourceUrl: true,
            scrapedData: true,
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

    return NextResponse.json({
      id: editorSession.id,
      generationId: editorSession.generationId,
      homepage: editorSession.homepageContent
        ? JSON.parse(editorSession.homepageContent)
        : null,
      products: editorSession.productsContent
        ? JSON.parse(editorSession.productsContent)
        : null,
      styles: editorSession.stylesContent
        ? JSON.parse(editorSession.stylesContent)
        : null,
      status: editorSession.status,
      importedThemeId: editorSession.importedThemeId,
      importedAt: editorSession.importedAt,
      generation: {
        id: editorSession.generation.id,
        status: editorSession.generation.status,
        sourceUrl: editorSession.generation.sourceUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching editor session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch editor session' },
      { status: 500 }
    );
  }
}

// PUT - Update an editor session (auto-save)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { homepage, products, styles } = body;

    // Validate that the session exists
    const existingSession = await prisma.editorSession.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Editor session not found' },
        { status: 404 }
      );
    }

    // Prevent updates if already imported
    if (existingSession.status === 'imported') {
      return NextResponse.json(
        { error: 'Cannot modify an imported session' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      homepageContent?: string;
      productsContent?: string;
      stylesContent?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (homepage !== undefined) {
      updateData.homepageContent = JSON.stringify(homepage);
    }
    if (products !== undefined) {
      updateData.productsContent = JSON.stringify(products);
    }
    if (styles !== undefined) {
      updateData.stylesContent = JSON.stringify(styles);
    }

    // Update the session
    const updatedSession = await prisma.editorSession.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedSession.id,
      homepage: updatedSession.homepageContent
        ? JSON.parse(updatedSession.homepageContent)
        : null,
      products: updatedSession.productsContent
        ? JSON.parse(updatedSession.productsContent)
        : null,
      styles: updatedSession.stylesContent
        ? JSON.parse(updatedSession.stylesContent)
        : null,
      status: updatedSession.status,
      updatedAt: updatedSession.updatedAt,
    });
  } catch (error) {
    console.error('Error updating editor session:', error);
    return NextResponse.json(
      { error: 'Failed to update editor session' },
      { status: 500 }
    );
  }
}
