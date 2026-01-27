'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  BlockStack,
  Text,
} from '@shopify/polaris';
import { useAppBridge } from '@/components/providers/AppBridgeProvider';

interface GenerateFormProps {
  onSubmit: (url: string) => Promise<void>;
  isLoading: boolean;
}

export function GenerateForm({ onSubmit, isLoading }: GenerateFormProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useAppBridge();

  const validateUrl = (urlToValidate: string): boolean => {
    try {
      const urlObj = new URL(urlToValidate);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Add protocol if missing
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    if (!validateUrl(normalizedUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      await onSubmit(normalizedUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start generation';
      setError(message);
      showToast(message, true);
    }
  }, [url, onSubmit, showToast]);

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    if (error) setError(null);
  }, [error]);

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Enter Website URL
        </Text>
        <Text as="p" tone="subdued">
          Enter the URL of the website you want to clone. Our AI will analyze
          the design and content to generate a matching Shopify theme and products.
        </Text>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <FormLayout>
          <TextField
            label="Website URL"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
            autoComplete="url"
            type="url"
            helpText="Enter the full URL including https://"
            disabled={isLoading}
          />
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!url.trim()}
          >
            Generate Store
          </Button>
        </FormLayout>
      </BlockStack>
    </Card>
  );
}
