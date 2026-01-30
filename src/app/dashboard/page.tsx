'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  InlineStack,
  Box,
  Banner,
  Badge,
  ProgressBar,
} from '@shopify/polaris';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppBridgeProvider } from '@/components/providers/AppBridgeProvider';
import { RecentGenerations } from '@/components/ui/RecentGenerations';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { SubscriptionStatus, PlanId } from '@/types/billing';
import { PLANS } from '@/lib/billing/constants';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shopParams, setShopParams] = useState('');
  const [shop, setShop] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<SubscriptionStatus | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBillingSuccess, setShowBillingSuccess] = useState(false);

  const billingSuccess = searchParams.get('billing');
  const upgradedPlan = searchParams.get('plan');

  const fetchBillingStatus = useCallback(async (shopDomain: string) => {
    try {
      const response = await fetch(
        `/api/billing/status?shop=${encodeURIComponent(shopDomain)}`
      );
      if (response.ok) {
        const data: SubscriptionStatus = await response.json();
        setBillingStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch billing status:', err);
    }
  }, []);

  // Preserve shop and host params for navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop');
    const host = params.get('host');
    if (shopParam) {
      setShop(shopParam);
      fetchBillingStatus(shopParam);
    }
    const queryParts = [];
    if (shopParam) queryParts.push(`shop=${encodeURIComponent(shopParam)}`);
    if (host) queryParts.push(`host=${encodeURIComponent(host)}`);
    setShopParams(queryParts.length > 0 ? `?${queryParts.join('&')}` : '');

    // Show success banner if redirected from billing
    if (billingSuccess === 'success') {
      setShowBillingSuccess(true);
    }
  }, [billingSuccess, fetchBillingStatus]);

  const isNearLimit = billingStatus &&
    billingStatus.usage.generationsLimit !== -1 &&
    billingStatus.usage.generationsThisMonth >= billingStatus.usage.generationsLimit * 0.8;

  const isAtLimit = billingStatus &&
    billingStatus.usage.generationsLimit !== -1 &&
    billingStatus.usage.generationsThisMonth >= billingStatus.usage.generationsLimit;

  const usagePercent = billingStatus && billingStatus.usage.generationsLimit !== -1
    ? Math.min(100, (billingStatus.usage.generationsThisMonth / billingStatus.usage.generationsLimit) * 100)
    : 0;

  return (
    <Page title="Dashboard">
      <Layout>
        {showBillingSuccess && upgradedPlan && (
          <Layout.Section>
            <Banner
              tone="success"
              onDismiss={() => setShowBillingSuccess(false)}
            >
              Successfully upgraded to the {PLANS[upgradedPlan as PlanId]?.name || upgradedPlan} plan!
            </Banner>
          </Layout.Section>
        )}

        {isAtLimit && (
          <Layout.Section>
            <Banner
              tone="warning"
              title="Generation limit reached"
              action={{
                content: 'Upgrade Plan',
                onAction: () => setShowUpgradeModal(true),
              }}
            >
              You&apos;ve used all your generations this month. Upgrade your plan to continue.
            </Banner>
          </Layout.Section>
        )}

        {isNearLimit && !isAtLimit && (
          <Layout.Section>
            <Banner tone="info">
              You&apos;ve used {billingStatus?.usage.generationsThisMonth} of {billingStatus?.usage.generationsLimit} generations this month.
            </Banner>
          </Layout.Section>
        )}

        {!isAtLimit && !isNearLimit && (
          <Layout.Section>
            <Banner tone="info">
              Welcome to Cloney! Get started by generating your first store clone.
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Quick Actions
              </Text>
              <Text as="p" tone="subdued">
                Clone any website into your Shopify store using AI-powered
                analysis.
              </Text>
              <InlineStack gap="300">
                <Button variant="primary" onClick={() => router.push(`/generate${shopParams}`)}>
                  Generate New Store
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  How It Works
                </Text>
                <BlockStack gap="200">
                  <Box>
                    <Text as="p" fontWeight="semibold">
                      1. Enter a URL
                    </Text>
                    <Text as="p" tone="subdued">
                      Provide the website you want to clone
                    </Text>
                  </Box>
                  <Box>
                    <Text as="p" fontWeight="semibold">
                      2. AI Analysis
                    </Text>
                    <Text as="p" tone="subdued">
                      Our AI extracts colors, fonts, and products
                    </Text>
                  </Box>
                  <Box>
                    <Text as="p" fontWeight="semibold">
                      3. Theme Generation
                    </Text>
                    <Text as="p" tone="subdued">
                      A custom theme is created matching the source
                    </Text>
                  </Box>
                  <Box>
                    <Text as="p" fontWeight="semibold">
                      4. Products Created
                    </Text>
                    <Text as="p" tone="subdued">
                      Products are auto-generated from the source
                    </Text>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Recent Generations
                </Text>
                {shop ? (
                  <RecentGenerations shopDomain={shop} />
                ) : (
                  <Text as="p" tone="subdued">
                    Loading...
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {billingStatus && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <BlockStack gap="100">
                      <InlineStack gap="200">
                        <Text as="h2" variant="headingMd">
                          Your Plan
                        </Text>
                        <Badge tone={billingStatus.plan === 'free' ? 'info' : 'success'}>
                          {PLANS[billingStatus.plan].name}
                        </Badge>
                      </InlineStack>
                      {billingStatus.billingCycle && (
                        <Text as="p" tone="subdued" variant="bodySm">
                          Billed {billingStatus.billingCycle}
                        </Text>
                      )}
                    </BlockStack>
                    <Button
                      onClick={() => router.push(`/pricing${shopParams}`)}
                      variant={billingStatus.plan === 'free' ? 'primary' : undefined}
                    >
                      {billingStatus.plan === 'free' ? 'Upgrade' : 'Manage Plan'}
                    </Button>
                  </InlineStack>

                  {billingStatus.usage.generationsLimit !== -1 && (
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text as="p" variant="bodySm">
                          Generations this month
                        </Text>
                        <Text as="p" variant="bodySm" fontWeight="semibold">
                          {billingStatus.usage.generationsThisMonth} / {billingStatus.usage.generationsLimit}
                        </Text>
                      </InlineStack>
                      <ProgressBar
                        progress={usagePercent}
                        tone={isAtLimit ? 'critical' : 'primary'}
                        size="small"
                      />
                    </BlockStack>
                  )}

                  {billingStatus.usage.generationsLimit === -1 && (
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm">
                        Generations this month
                      </Text>
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        {billingStatus.usage.generationsThisMonth} (Unlimited)
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>

        {billingStatus && shop && (
          <UpgradeModal
            open={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            currentPlan={billingStatus.plan}
            usedGenerations={billingStatus.usage.generationsThisMonth}
            maxGenerations={billingStatus.usage.generationsLimit}
            shopDomain={shop}
          />
        )}
      </Page>
  );
}

export default function DashboardPage() {
  return (
    <AppBridgeProvider>
      <Suspense fallback={<Page title="Dashboard"><Text as="p">Loading...</Text></Page>}>
        <DashboardContent />
      </Suspense>
    </AppBridgeProvider>
  );
}
