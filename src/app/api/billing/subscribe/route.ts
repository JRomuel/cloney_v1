import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSubscription } from '@/lib/billing/subscription';
import { formatErrorResponse, ValidationError } from '@/errors';
import { PlanId, BillingCycle } from '@/types/billing';

export const dynamic = 'force-dynamic';

const SubscribeRequestSchema = z.object({
  plan: z.enum(['starter', 'growth']),
  billingCycle: z.enum(['monthly', 'annual']),
});

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

    const body = await request.json();
    const parseResult = SubscribeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new ValidationError(errorMessage);
    }

    const { plan, billingCycle } = parseResult.data as {
      plan: PlanId;
      billingCycle: BillingCycle;
    };

    const result = await createSubscription(shopDomain, plan, billingCycle);

    return NextResponse.json({
      confirmationUrl: result.confirmationUrl,
      subscriptionId: result.subscriptionId,
    });
  } catch (error) {
    console.error('Subscribe API error:', error);
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(
      { error: errorResponse.error, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}
