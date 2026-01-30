import prisma from '@/lib/db/prisma';
import { createGraphQLClient } from '@/lib/shopify/client';
import { decrypt } from '@/lib/utils/encryption';
import { BillingError } from '@/errors';
import {
  APP_SUBSCRIPTION_CREATE,
  CURRENT_APP_INSTALLATION,
  APP_SUBSCRIPTION_CANCEL,
  AppSubscriptionCreateResponse,
  CurrentAppInstallationResponse,
  AppSubscriptionCancelResponse,
} from './graphql';
import { PLANS, getPlanPrice, formatPlanName } from './constants';
import {
  PlanId,
  BillingCycle,
  SubscriptionStatus,
  CreateSubscriptionResult,
} from '@/types/billing';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function getSubscriptionStatus(
  shopDomain: string
): Promise<SubscriptionStatus> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: {
      plan: true,
      billingCycle: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      generationsThisMonth: true,
      generationsResetAt: true,
    },
  });

  if (!shop) {
    throw new BillingError('Shop not found');
  }

  const plan = (shop.plan || 'free') as PlanId;
  const planLimits = PLANS[plan].limits;

  return {
    plan,
    billingCycle: shop.billingCycle as BillingCycle | null,
    status: shop.subscriptionStatus as 'active' | 'cancelled' | 'pending' | null,
    currentPeriodEnd: shop.currentPeriodEnd,
    usage: {
      generationsThisMonth: shop.generationsThisMonth,
      generationsLimit: planLimits.generationsPerMonth,
      generationsResetAt: shop.generationsResetAt,
    },
  };
}

export async function createSubscription(
  shopDomain: string,
  planId: PlanId,
  billingCycle: BillingCycle
): Promise<CreateSubscriptionResult> {
  if (planId === 'free') {
    throw new BillingError('Cannot create subscription for free plan');
  }

  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { accessToken: true },
  });

  if (!shop) {
    throw new BillingError('Shop not found');
  }

  const accessToken = decrypt(shop.accessToken);
  const client = createGraphQLClient(shopDomain, accessToken);

  const price = getPlanPrice(planId, billingCycle);
  const planName = formatPlanName(planId, billingCycle);
  const interval = billingCycle === 'annual' ? 'ANNUAL' : 'EVERY_30_DAYS';

  const returnUrl = `${APP_URL}/api/billing/callback?shop=${encodeURIComponent(
    shopDomain
  )}&plan=${planId}&cycle=${billingCycle}`;

  // Use test mode in development
  const isTest = process.env.NODE_ENV !== 'production';

  const response = await client.mutate<AppSubscriptionCreateResponse>(
    APP_SUBSCRIPTION_CREATE,
    {
      name: planName,
      returnUrl,
      test: isTest,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: price,
                currencyCode: 'USD',
              },
              interval,
            },
          },
        },
      ],
    }
  );

  const { appSubscriptionCreate } = response;

  if (appSubscriptionCreate.userErrors.length > 0) {
    const errorMessages = appSubscriptionCreate.userErrors
      .map((e) => e.message)
      .join(', ');
    throw new BillingError(`Failed to create subscription: ${errorMessages}`);
  }

  if (!appSubscriptionCreate.confirmationUrl || !appSubscriptionCreate.appSubscription) {
    throw new BillingError('Failed to create subscription: No confirmation URL returned');
  }

  // Store pending subscription info
  await prisma.shop.update({
    where: { domain: shopDomain },
    data: {
      subscriptionId: appSubscriptionCreate.appSubscription.id,
      subscriptionStatus: 'pending',
    },
  });

  return {
    confirmationUrl: appSubscriptionCreate.confirmationUrl,
    subscriptionId: appSubscriptionCreate.appSubscription.id,
  };
}

export async function syncSubscriptionStatus(shopDomain: string): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { accessToken: true, subscriptionId: true },
  });

  if (!shop) {
    throw new BillingError('Shop not found');
  }

  const accessToken = decrypt(shop.accessToken);
  const client = createGraphQLClient(shopDomain, accessToken);

  const response = await client.query<CurrentAppInstallationResponse>(
    CURRENT_APP_INSTALLATION
  );

  const activeSubscriptions =
    response.currentAppInstallation.activeSubscriptions || [];

  if (activeSubscriptions.length === 0) {
    // No active subscription - reset to free plan
    await prisma.shop.update({
      where: { domain: shopDomain },
      data: {
        plan: 'free',
        billingCycle: null,
        subscriptionId: null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
      },
    });
    return;
  }

  // Get the most recent active subscription
  const subscription = activeSubscriptions[0];
  const planId = parsePlanIdFromName(subscription.name);
  const billingCycle = parseBillingCycleFromName(subscription.name);

  await prisma.shop.update({
    where: { domain: shopDomain },
    data: {
      plan: planId,
      billingCycle,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status.toLowerCase(),
      currentPeriodEnd: subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null,
    },
  });
}

export async function cancelSubscription(shopDomain: string): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { accessToken: true, subscriptionId: true },
  });

  if (!shop) {
    throw new BillingError('Shop not found');
  }

  if (!shop.subscriptionId) {
    throw new BillingError('No active subscription to cancel');
  }

  const accessToken = decrypt(shop.accessToken);
  const client = createGraphQLClient(shopDomain, accessToken);

  const response = await client.mutate<AppSubscriptionCancelResponse>(
    APP_SUBSCRIPTION_CANCEL,
    { id: shop.subscriptionId }
  );

  if (response.appSubscriptionCancel.userErrors.length > 0) {
    const errorMessages = response.appSubscriptionCancel.userErrors
      .map((e) => e.message)
      .join(', ');
    throw new BillingError(`Failed to cancel subscription: ${errorMessages}`);
  }

  // Update shop to free plan
  await prisma.shop.update({
    where: { domain: shopDomain },
    data: {
      plan: 'free',
      billingCycle: null,
      subscriptionId: null,
      subscriptionStatus: 'cancelled',
      currentPeriodEnd: null,
    },
  });
}

export async function activateSubscription(
  shopDomain: string,
  planId: PlanId,
  billingCycle: BillingCycle
): Promise<void> {
  // Sync with Shopify to get actual subscription status
  await syncSubscriptionStatus(shopDomain);

  // Verify the subscription is active
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { subscriptionStatus: true },
  });

  if (shop?.subscriptionStatus !== 'active') {
    // If not active from Shopify's perspective, manually update
    // This handles the case where merchant approves in callback
    await prisma.shop.update({
      where: { domain: shopDomain },
      data: {
        plan: planId,
        billingCycle,
        subscriptionStatus: 'active',
      },
    });
  }
}

// Helper functions to parse plan info from subscription name
function parsePlanIdFromName(name: string): PlanId {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('growth')) return 'growth';
  if (lowerName.includes('starter')) return 'starter';
  return 'free';
}

function parseBillingCycleFromName(name: string): BillingCycle {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('annual')) return 'annual';
  return 'monthly';
}
