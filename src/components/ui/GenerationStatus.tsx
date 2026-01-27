'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  BlockStack,
  Text,
  ProgressBar,
  Banner,
  Button,
  InlineStack,
  Badge,
  Box,
} from '@shopify/polaris';
import { GenerationProgress, GenerationStatus as StatusType } from '@/types';

interface GenerationStatusProps {
  generationId: string;
  shopDomain: string;
  onComplete?: () => void;
  onError?: (errorMessage: string) => void;
}

function getShopSlug(shopDomain: string): string {
  // Convert "my-store.myshopify.com" to "my-store"
  return shopDomain.replace('.myshopify.com', '');
}

const STATUS_LABELS: Record<StatusType, string> = {
  pending: 'Starting...',
  scraping: 'Analyzing website...',
  analyzing: 'AI processing content...',
  editing: 'Ready for editing',
  creating_theme: 'Creating theme...',
  creating_products: 'Creating products...',
  completed: 'Complete!',
  failed: 'Failed',
};

const STATUS_PROGRESS: Record<StatusType, number> = {
  pending: 5,
  scraping: 20,
  analyzing: 45,
  editing: 100,
  creating_theme: 65,
  creating_products: 85,
  completed: 100,
  failed: 0,
};

export function GenerationStatus({
  generationId,
  shopDomain,
  onComplete,
  onError,
}: GenerationStatusProps) {
  const shopSlug = getShopSlug(shopDomain);
  const [status, setStatus] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/generation/${generationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);

      if (data.status === 'completed') {
        setIsPolling(false);
        onComplete?.();
      } else if (data.status === 'failed') {
        setIsPolling(false);
        setError(data.errorMessage || 'Generation failed');
        onError?.(data.errorMessage || 'Generation failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(message);
      setIsPolling(false);
    }
  }, [generationId, onComplete, onError]);

  useEffect(() => {
    fetchStatus();

    if (isPolling) {
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, isPolling]);

  const progress = status
    ? status.progress || STATUS_PROGRESS[status.status as StatusType] || 0
    : 0;

  const statusLabel = status
    ? STATUS_LABELS[status.status as StatusType] || status.status
    : 'Loading...';

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            Generation Progress
          </Text>
          <Badge
            tone={
              status?.status === 'completed'
                ? 'success'
                : status?.status === 'failed'
                ? 'critical'
                : 'info'
            }
          >
            {statusLabel}
          </Badge>
        </InlineStack>

        {error && (
          <Banner tone="critical">
            <Text as="p">{error}</Text>
          </Banner>
        )}

        <Box>
          <ProgressBar progress={progress} size="small" />
          <Text as="p" tone="subdued" alignment="end">
            {progress}%
          </Text>
        </Box>

        {status?.status === 'completed' && (
          <Banner tone="success">
            <BlockStack gap="200">
              <Text as="p" fontWeight="semibold">
                Analysis complete!
              </Text>
              <Text as="p">
                AI has analyzed your website and generated content. Loading editor...
              </Text>
            </BlockStack>
          </Banner>
        )}

        {status?.status === 'failed' && (
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        )}
      </BlockStack>
    </Card>
  );
}
