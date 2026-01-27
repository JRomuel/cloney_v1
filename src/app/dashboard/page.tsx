'use client';

import { useEffect, useState } from 'react';
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
} from '@shopify/polaris';
import { useRouter } from 'next/navigation';
import { AppBridgeProvider } from '@/components/providers/AppBridgeProvider';

function DashboardContent() {
  const router = useRouter();
  const [shopParams, setShopParams] = useState('');

  // Preserve shop and host params for navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop');
    const host = params.get('host');
    const queryParts = [];
    if (shop) queryParts.push(`shop=${encodeURIComponent(shop)}`);
    if (host) queryParts.push(`host=${encodeURIComponent(host)}`);
    setShopParams(queryParts.length > 0 ? `?${queryParts.join('&')}` : '');
  }, []);

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            Welcome to Cloney! Get started by generating your first store
            clone.
          </Banner>
        </Layout.Section>

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
                <Text as="p" tone="subdued">
                  No generations yet. Start by creating your first one!
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
  );
}

export default function DashboardPage() {
  return (
    <AppBridgeProvider>
      <DashboardContent />
    </AppBridgeProvider>
  );
}
