import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionStatus } from '@/lib/billing/subscription';
import { formatErrorResponse } from '@/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const status = await getSubscriptionStatus(shopDomain);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Billing status API error:', error);
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}
