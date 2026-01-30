import { Plan, PlanId, PlanLimits, BillingCycle } from '@/types/billing';

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    pricing: {
      monthly: 0,
      annual: 0,
    },
    limits: {
      generationsPerMonth: 1,
      productsPerGeneration: 5,
      themes: 'dawn',
    },
    features: [
      '1 generation per month',
      'Up to 5 products per generation',
      'Dawn theme only',
      'Basic support',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small businesses',
    pricing: {
      monthly: 19,
      annual: 190, // ~17% discount
    },
    limits: {
      generationsPerMonth: 10,
      productsPerGeneration: 25,
      themes: 'all',
    },
    features: [
      '10 generations per month',
      'Up to 25 products per generation',
      'All themes included',
      'Priority support',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'For growing businesses',
    pricing: {
      monthly: 49,
      annual: 490, // ~17% discount
    },
    limits: {
      generationsPerMonth: Infinity,
      productsPerGeneration: Infinity,
      themes: 'all',
    },
    features: [
      'Unlimited generations',
      'Unlimited products per generation',
      'All themes included',
      'Priority support',
      'Early access to new features',
    ],
    highlighted: true,
  },
};

export const PLAN_IDS: PlanId[] = ['free', 'starter', 'growth'];
export const BILLING_CYCLES: BillingCycle[] = ['monthly', 'annual'];

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId].limits;
}

export function getPlanPrice(planId: PlanId, cycle: BillingCycle): number {
  return PLANS[planId].pricing[cycle];
}

export function getAnnualSavingsPercent(planId: PlanId): number {
  const plan = PLANS[planId];
  if (plan.pricing.monthly === 0) return 0;
  const monthlyAnnual = plan.pricing.monthly * 12;
  const savings = ((monthlyAnnual - plan.pricing.annual) / monthlyAnnual) * 100;
  return Math.round(savings);
}

export function formatPlanName(planId: PlanId, cycle?: BillingCycle): string {
  const plan = PLANS[planId];
  if (!cycle || planId === 'free') return plan.name;
  return `${plan.name} (${cycle === 'annual' ? 'Annual' : 'Monthly'})`;
}

export function isUnlimited(value: number): boolean {
  return value === Infinity;
}
