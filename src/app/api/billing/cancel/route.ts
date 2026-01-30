import { NextRequest, NextResponse } from 'next/server';
import { cancelSubscription } from '@/lib/billing/subscription';
import { formatErrorResponse } from '@/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const shopDomain =
      request.headers.get('x-shopify-shop-domain') ||
      request.nextUrl.searchParams.get('shop');

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      );
    }

    await cancelSubscription(shopDomain);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel subscription API error:', error);
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}
