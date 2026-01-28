import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const shopDomain = request.nextUrl.searchParams.get('shop');
  const limitParam = request.nextUrl.searchParams.get('limit');
  const cursor = request.nextUrl.searchParams.get('cursor');

  if (!shopDomain) {
    return NextResponse.json({ error: 'Shop domain required' }, { status: 400 });
  }

  const limit = Math.min(parseInt(limitParam || '10'), 50);

  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
  });

  if (!shop) {
    return NextResponse.json({ generations: [], nextCursor: null, total: 0 });
  }

  const generations = await prisma.generation.findMany({
    where: {
      shopId: shop.id,
      status: { notIn: ['pending', 'scraping'] },
    },
    include: {
      editorSession: {
        select: { id: true, status: true, importedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = generations.length > limit;
  const items = hasMore ? generations.slice(0, -1) : generations;

  const formattedGenerations = items.map((gen) => {
    let thumbnailUrl: string | null = null;
    if (gen.scrapedData) {
      try {
        const scraped = JSON.parse(gen.scrapedData);
        thumbnailUrl = scraped.images?.[0]?.src || scraped.logoUrl || null;
      } catch {
        // Ignore parse errors
      }
    }
    return {
      id: gen.id,
      sourceUrl: gen.sourceUrl,
      status: gen.status,
      createdAt: gen.createdAt.toISOString(),
      updatedAt: gen.updatedAt.toISOString(),
      themeName: gen.themeName,
      thumbnailUrl,
      editorSession: gen.editorSession,
    };
  });

  return NextResponse.json({
    generations: formattedGenerations,
    nextCursor: hasMore ? items[items.length - 1].id : null,
    total: await prisma.generation.count({
      where: { shopId: shop.id, status: { notIn: ['pending', 'scraping'] } },
    }),
  });
}
