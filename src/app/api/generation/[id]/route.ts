import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { formatErrorResponse, NotFoundError } from '@/errors';
import { GenerationProgress } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const generation = await prisma.generation.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            shopifyProductId: true,
          },
        },
      },
    });

    if (!generation) {
      throw new NotFoundError('Generation');
    }

    const response: GenerationProgress = {
      id: generation.id,
      status: generation.status as GenerationProgress['status'],
      progress: generation.progress,
      errorMessage: generation.errorMessage || undefined,
      themeId: generation.themeId || undefined,
      themeName: generation.themeName || undefined,
      productsCreated: generation.products.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Generation status API error:', error);
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}
