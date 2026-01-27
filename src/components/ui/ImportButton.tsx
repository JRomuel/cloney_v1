'use client';

import { useState, useCallback } from 'react';
import {
  Button,
  Modal,
  BlockStack,
  Text,
  Banner,
  InlineStack,
  Spinner,
} from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';

interface ImportButtonProps {
  shopDomain: string;
  onSuccess?: (result: { themeId: string; themeName: string; productsCreated: number }) => void;
  onError?: (error: string) => void;
}

export function ImportButton({ shopDomain, onSuccess, onError }: ImportButtonProps) {
  const { sessionId, products } = useEditorStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    themeId?: string;
    themeName?: string;
    productsCreated?: number;
    error?: string;
  } | null>(null);

  const shopSlug = shopDomain.replace('.myshopify.com', '');

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
    setImportResult(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isImporting) {
      setIsModalOpen(false);
    }
  }, [isImporting]);

  const handleImport = useCallback(async () => {
    if (!sessionId) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await fetch(`/api/editor/import?shop=${encodeURIComponent(shopDomain)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult({
        success: true,
        themeId: data.themeId,
        themeName: data.themeName,
        productsCreated: data.productsCreated,
      });

      onSuccess?.(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setImportResult({
        success: false,
        error: message,
      });
      onError?.(message);
    } finally {
      setIsImporting(false);
    }
  }, [sessionId, shopDomain, onSuccess, onError]);

  return (
    <>
      <Button variant="primary" onClick={handleOpenModal} disabled={!sessionId}>
        Import to Shopify
      </Button>

      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={importResult?.success ? 'Import Complete!' : 'Import to Shopify'}
        primaryAction={
          importResult?.success
            ? {
                content: 'View Theme',
                url: `https://admin.shopify.com/store/${shopSlug}/themes`,
                external: true,
              }
            : {
                content: isImporting ? 'Importing...' : 'Import',
                onAction: handleImport,
                loading: isImporting,
                disabled: isImporting,
              }
        }
        secondaryActions={[
          {
            content: importResult?.success ? 'Close' : 'Cancel',
            onAction: handleCloseModal,
            disabled: isImporting,
          },
        ]}
      >
        <Modal.Section>
          {isImporting && (
            <BlockStack gap="400" inlineAlign="center">
              <Spinner size="large" />
              <Text as="p">Creating your store...</Text>
              <Text as="p" tone="subdued">
                This may take a minute. Please don't close this window.
              </Text>
            </BlockStack>
          )}

          {!isImporting && !importResult && (
            <BlockStack gap="400">
              <Text as="p">
                This will create the following in your Shopify store:
              </Text>
              <BlockStack gap="200">
                <Text as="p">
                  • A new <strong>unpublished</strong> theme with your customizations
                </Text>
                <Text as="p">
                  • <strong>{products.length}</strong> products as <strong>drafts</strong>
                </Text>
              </BlockStack>
              <Banner tone="info">
                <Text as="p">
                  Your existing theme and products will not be affected. You can
                  review everything before publishing.
                </Text>
              </Banner>
            </BlockStack>
          )}

          {importResult?.success && (
            <BlockStack gap="400">
              <Banner tone="success">
                <Text as="p" fontWeight="semibold">
                  Your store has been created successfully!
                </Text>
              </Banner>
              <BlockStack gap="200">
                {importResult.themeName && (
                  <Text as="p">
                    Theme: <strong>{importResult.themeName}</strong> (unpublished)
                  </Text>
                )}
                {importResult.productsCreated !== undefined && (
                  <Text as="p">
                    Products created: <strong>{importResult.productsCreated}</strong> (as drafts)
                  </Text>
                )}
              </BlockStack>
              <InlineStack gap="300">
                <Button
                  url={`https://admin.shopify.com/store/${shopSlug}/themes`}
                  external
                >
                  View Themes
                </Button>
                <Button
                  url={`https://admin.shopify.com/store/${shopSlug}/products`}
                  external
                  variant="plain"
                >
                  View Products
                </Button>
              </InlineStack>
            </BlockStack>
          )}

          {importResult?.error && (
            <Banner tone="critical">
              <Text as="p">{importResult.error}</Text>
            </Banner>
          )}
        </Modal.Section>
      </Modal>
    </>
  );
}
