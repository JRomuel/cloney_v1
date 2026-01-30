'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import {
  Page,
  Layout,
  BlockStack,
  InlineGrid,
  Text,
  Banner,
  Spinner,
  Box,
} from '@shopify/polaris';
import { useSearchParams } from 'next/navigation';
import { AppBridgeProvider } from '@/components/providers/AppBridgeProvider';
import { PlanCard } from '@/components/billing/PlanCard';
import { BillingCycleToggle } from '@/components/billing/BillingCycleToggle';
import { Plan, BillingCycle, PlanId, SubscriptionStatus } from '@/types/billing';
import { PLANS, PLAN_IDS, getAnnualSavingsPercent } from '@/lib/billing/constants';

function PricingContent() {
  const searchParams = useSearchParams();
  const shopDomain = searchParams.get('shop');
  const status = searchParams.get('status');
  const error = searchParams.get('error');

  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<PlanId | null>(null);

  const fetchBillingStatus = useCallback(async () => {
    if (!shopDomain) return;

    try {
      const response = await fetch(
        `/api/billing/status?shop=${encodeURIComponent(shopDomain)}`
      );
      const data: SubscriptionStatus = await response.json();
      setCurrentPlan(data.plan);
      if (data.billingCycle) {
        setCycle(data.billingCycle);
      }
    } catch (err) {
      console.error('Failed to fetch billing status:', err);
    } finally {
      setLoading(false);
    }
  }, [shopDomain]);

  useEffect(() => {
    fetchBillingStatus();
  }, [fetchBillingStatus]);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!shopDomain) return;

    // Handle downgrade to free
    if (planId === 'free') {
      if (confirm('Are you sure you want to downgrade to the free plan? You will lose access to premium features.')) {
        setSubscribing(planId);
        try {
          await fetch(`/api/billing/cancel?shop=${encodeURIComponent(shopDomain)}`, {
            method: 'POST',
          });
          setCurrentPlan('free');
        } catch (err) {
          console.error('Failed to cancel subscription:', err);
        } finally {
          setSubscribing(null);
        }
      }
      return;
    }

    // Handle upgrade/change to paid plan
    setSubscribing(planId);
    try {
      const response = await fetch(
        `/api/billing/subscribe?shop=${encodeURIComponent(shopDomain)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: planId,
            billingCycle: cycle,
          }),
        }
      );

      const data = await response.json();

      if (data.confirmationUrl) {
        // Redirect to Shopify for payment approval
        window.top?.location.assign(data.confirmationUrl);
      } else {
        console.error('No confirmation URL returned');
        setSubscribing(null);
      }
    } catch (err) {
      console.error('Failed to create subscription:', err);
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <Page title="Pricing">
        <Box padding="800">
          <BlockStack align="center">
            <Spinner size="large" />
            <Text as="p">Loading pricing information...</Text>
          </BlockStack>
        </Box>
      </Page>
    );
  }

  return (
    <Page
      title="Choose Your Plan"
      backAction={{ content: 'Dashboard', url: `/dashboard?shop=${shopDomain}` }}
    >
      <Layout>
        {status === 'cancelled' && (
          <Layout.Section>
            <Banner tone="warning">
              Subscription was not completed. Please try again or contact support.
            </Banner>
          </Layout.Section>
        )}

        {error === 'activation_failed' && (
          <Layout.Section>
            <Banner tone="critical">
              There was an error activating your subscription. Please try again.
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <BlockStack gap="600" align="center">
            <BlockStack gap="200" align="center">
              <Text as="h2" variant="headingLg">
                Simple, transparent pricing
              </Text>
              <Text as="p" tone="subdued">
                Choose the plan that works best for your business
              </Text>
            </BlockStack>

            <BillingCycleToggle
              cycle={cycle}
              onChange={setCycle}
              savingsPercent={getAnnualSavingsPercent('starter')}
            />
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 1, md: 3 }} gap="400">
            {PLAN_IDS.map((planId) => (
              <PlanCard
                key={planId}
                plan={PLANS[planId]}
                cycle={cycle}
                currentPlan={currentPlan}
                onSelect={handleSelectPlan}
                loading={subscribing === planId}
              />
            ))}
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="200" align="center">
            <Text as="p" tone="subdued" variant="bodySm">
              All plans include a 14-day free trial. Cancel anytime.
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              Subscriptions are billed through your Shopify account.
            </Text>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default function PricingPage() {
  return (
    <AppBridgeProvider>
      <Suspense fallback={<Page title="Pricing"><Box padding="800"><Spinner size="large" /></Box></Page>}>
        <PricingContent />
      </Suspense>
    </AppBridgeProvider>
  );
}
