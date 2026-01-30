import { NextRequest, NextResponse } from 'next/server';
import { activateSubscription } from '@/lib/billing/subscription';
import { PlanId, BillingCycle } from '@/types/billing';

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const shopDomain = searchParams.get('shop');
    const planId = searchParams.get('plan') as PlanId | null;
    const billingCycle = searchParams.get('cycle') as BillingCycle | null;
    const chargeId = searchParams.get('charge_id');

    if (!shopDomain) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?error=missing_shop`
      );
    }

    // If no charge_id, the merchant declined or cancelled
    if (!chargeId) {
      return NextResponse.redirect(
        `${APP_URL}/pricing?shop=${encodeURIComponent(shopDomain)}&status=cancelled`
      );
    }

    // Activate the subscription
    if (planId && billingCycle) {
      await activateSubscription(shopDomain, planId, billingCycle);
    }

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      `${APP_URL}/dashboard?shop=${encodeURIComponent(shopDomain)}&billing=success&plan=${planId}`
    );
  } catch (error) {
    console.error('Billing callback error:', error);
    const shopDomain = request.nextUrl.searchParams.get('shop') || '';
    return NextResponse.redirect(
      `${APP_URL}/pricing?shop=${encodeURIComponent(shopDomain)}&error=activation_failed`
    );
  }
}
