import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { runGenerationPipeline, getShopContext } from '@/lib/pipeline/generator';
import { formatErrorResponse, ValidationError, NotFoundError } from '@/errors';

const GenerateRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

export async function POST(request: NextRequest) {
  try {
    // For embedded apps, the shop is passed via session or header
    // In development, we can also accept it as a query param
    const shopDomain =
      request.headers.get('x-shopify-shop-domain') ||
      request.nextUrl.searchParams.get('shop');

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = GenerateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new ValidationError(errorMessage);
    }

    const { url } = parseResult.data;

    // Get shop context (including decrypted access token)
    const shopContext = await getShopContext(shopDomain);

    if (!shopContext) {
      throw new NotFoundError('Shop not found or not authorized');
    }

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        shopId: shopContext.shopId,
        sourceUrl: url,
        status: 'pending',
        progress: 0,
      },
    });

    // Start the pipeline asynchronously
    // In production, this should be moved to a background job queue
    runGenerationPipeline({
      generationId: generation.id,
      shopId: shopContext.shopId,
      shopDomain,
      accessToken: shopContext.accessToken,
      sourceUrl: url,
    }).catch((error) => {
      console.error('Pipeline error:', error);
    });

    return NextResponse.json({
      generationId: generation.id,
      status: 'pending',
    });
  } catch (error) {
    console.error('Generate API error:', error);
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}
