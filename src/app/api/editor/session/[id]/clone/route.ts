import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Reset an imported session to allow continued editing
// Note: Due to the unique constraint on generationId, we reset the existing session
// rather than creating a new one. The previous import remains in Shopify.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Find the session
    const session = await prisma.editorSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Editor session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'imported') {
      return NextResponse.json(
        { error: 'Session is already editable' },
        { status: 400 }
      );
    }

    // Reset the session status to allow editing again
    // The previously imported theme remains in Shopify
    const updatedSession = await prisma.editorSession.update({
      where: { id },
      data: {
        status: 'editing',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: updatedSession.id,
      generationId: updatedSession.generationId,
      homepage: updatedSession.homepageContent
        ? JSON.parse(updatedSession.homepageContent)
        : null,
      products: updatedSession.productsContent
        ? JSON.parse(updatedSession.productsContent)
        : null,
      styles: updatedSession.stylesContent
        ? JSON.parse(updatedSession.stylesContent)
        : null,
      selectedThemeId: updatedSession.selectedThemeId,
      status: updatedSession.status,
    });
  } catch (error) {
    console.error('Error resetting editor session:', error);
    return NextResponse.json(
      { error: 'Failed to reset editor session' },
      { status: 500 }
    );
  }
}
