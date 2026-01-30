export type PlanId = 'free' | 'starter' | 'growth';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanLimits {
  generationsPerMonth: number;
  productsPerGeneration: number;
  themes: 'dawn' | 'all';
}

export interface PlanPricing {
  monthly: number;
  annual: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: string[];
  highlighted?: boolean;
}

export interface SubscriptionStatus {
  plan: PlanId;
  billingCycle: BillingCycle | null;
  status: 'active' | 'cancelled' | 'pending' | null;
  currentPeriodEnd: Date | null;
  usage: {
    generationsThisMonth: number;
    generationsLimit: number;
    generationsResetAt: Date | null;
  };
}

export interface CreateSubscriptionResult {
  confirmationUrl: string;
  subscriptionId: string;
}

export interface ShopifyAppSubscription {
  id: string;
  name: string;
  status: string;
  currentPeriodEnd?: string;
  lineItems?: Array<{
    plan: {
      pricingDetails: {
        price: {
          amount: string;
          currencyCode: string;
        };
        interval: string;
      };
    };
  }>;
}

export interface LimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  plan: PlanId;
}
