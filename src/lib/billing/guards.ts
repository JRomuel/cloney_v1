import prisma from '@/lib/db/prisma';
import { PLANS } from './constants';
import { PlanId, LimitCheckResult } from '@/types/billing';
import { PlanLimitError } from '@/errors';

/**
 * Check if a shop has reached their generation limit for the current month
 */
export async function checkGenerationLimit(
  shopDomain: string
): Promise<LimitCheckResult> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: {
      plan: true,
      generationsThisMonth: true,
      generationsResetAt: true,
    },
  });

  if (!shop) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      plan: 'free',
    };
  }

  const plan = (shop.plan || 'free') as PlanId;
  const limit = PLANS[plan].limits.generationsPerMonth;

  // Check if we need to reset the monthly counter
  const now = new Date();
  const resetAt = shop.generationsResetAt;

  let currentUsage = shop.generationsThisMonth;

  if (!resetAt || now > resetAt) {
    // Reset the counter - it's a new billing period
    const nextReset = getNextResetDate();
    await prisma.shop.update({
      where: { domain: shopDomain },
      data: {
        generationsThisMonth: 0,
        generationsResetAt: nextReset,
      },
    });
    currentUsage = 0;
  }

  return {
    allowed: currentUsage < limit,
    used: currentUsage,
    limit: limit === Infinity ? -1 : limit, // -1 indicates unlimited
    plan,
  };
}

/**
 * Check product limit for a generation based on plan
 */
export async function checkProductLimit(
  shopDomain: string,
  productCount: number
): Promise<LimitCheckResult> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { plan: true },
  });

  if (!shop) {
    return {
      allowed: false,
      used: productCount,
      limit: 0,
      plan: 'free',
    };
  }

  const plan = (shop.plan || 'free') as PlanId;
  const limit = PLANS[plan].limits.productsPerGeneration;

  return {
    allowed: productCount <= limit,
    used: productCount,
    limit: limit === Infinity ? -1 : limit,
    plan,
  };
}

/**
 * Check if a theme is available for the shop's plan
 */
export async function checkThemeAccess(
  shopDomain: string,
  themeId: string
): Promise<boolean> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { plan: true },
  });

  if (!shop) return false;

  const plan = (shop.plan || 'free') as PlanId;
  const themeAccess = PLANS[plan].limits.themes;

  // Free plan only has access to dawn theme
  if (themeAccess === 'dawn') {
    return themeId === 'dawn';
  }

  // Paid plans have access to all themes
  return true;
}

/**
 * Increment the generation counter after a successful generation
 */
export async function incrementGenerationCount(
  shopDomain: string
): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { generationsResetAt: true },
  });

  // Ensure reset date is set
  const now = new Date();
  const resetAt = shop?.generationsResetAt;

  if (!resetAt || now > resetAt) {
    // Need to reset first
    await prisma.shop.update({
      where: { domain: shopDomain },
      data: {
        generationsThisMonth: 1,
        generationsResetAt: getNextResetDate(),
      },
    });
  } else {
    // Just increment
    await prisma.shop.update({
      where: { domain: shopDomain },
      data: {
        generationsThisMonth: { increment: 1 },
      },
    });
  }
}

/**
 * Enforce generation limit - throws PlanLimitError if limit reached
 */
export async function enforceGenerationLimit(
  shopDomain: string
): Promise<void> {
  const check = await checkGenerationLimit(shopDomain);

  if (!check.allowed) {
    throw new PlanLimitError(
      `You have reached your monthly generation limit (${check.used}/${check.limit}). Please upgrade your plan for more generations.`,
      check.used,
      check.limit,
      check.plan
    );
  }
}

/**
 * Get available themes for a shop based on their plan
 */
export async function getAvailableThemes(
  shopDomain: string
): Promise<string[]> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { plan: true },
  });

  const plan = (shop?.plan || 'free') as PlanId;
  const themeAccess = PLANS[plan].limits.themes;

  if (themeAccess === 'dawn') {
    return ['dawn'];
  }

  // Return all available themes for paid plans
  // This would typically come from a themes config
  return ['dawn', 'tinker'];
}

/**
 * Check if a shop has a paid plan (starter or growth)
 */
export async function checkPaidPlan(shopDomain: string): Promise<{
  hasPaidPlan: boolean;
  plan: PlanId;
}> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { plan: true },
  });

  if (!shop) {
    return { hasPaidPlan: false, plan: 'free' };
  }

  const plan = (shop.plan || 'free') as PlanId;
  const hasPaidPlan = plan === 'starter' || plan === 'growth';

  return { hasPaidPlan, plan };
}

/**
 * Enforce paid plan requirement - throws PlanLimitError if on free plan
 */
export async function enforcePaidPlan(shopDomain: string): Promise<void> {
  const { hasPaidPlan, plan } = await checkPaidPlan(shopDomain);

  if (!hasPaidPlan) {
    throw new PlanLimitError(
      'A paid plan is required to import themes. Please upgrade to Starter or Growth.',
      0,
      0,
      plan
    );
  }
}

/**
 * Calculate the next reset date (first of next month)
 */
function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}
