'use client';

import { useState, useCallback, useEffect } from 'react';
import { Page, Layout, BlockStack, Banner, Text, Frame } from '@shopify/polaris';
import { AppBridgeProvider, useAppBridge } from '@/components/providers/AppBridgeProvider';
import { GenerateForm } from '@/components/ui/GenerateForm';
import { GenerationStatus } from '@/components/ui/GenerationStatus';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { LeftPanel } from '@/components/editor/LeftPanel';
import { RightPanel } from '@/components/editor/RightPanel';
import { ImportButton } from '@/components/ui/ImportButton';
import { useEditorStore } from '@/stores/editorStore';
import { useEditorPersistence } from '@/hooks/useEditorPersistence';
import { GenerationStatus as StatusType } from '@/types';

type ViewState = 'input' | 'generating' | 'editing';

function GeneratePageContent() {
  const [viewState, setViewState] = useState<ViewState>('input');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<string | null>(null);
  const { showToast, setLoading } = useAppBridge();

  const { loadFromGeneration, reset: resetEditor, sessionId } = useEditorStore();
  const { isSaving, isDirty } = useEditorPersistence();

  // Load a generation by ID into the editor
  const loadGeneration = useCallback(
    async (genId: string) => {
      setIsLoading(true);
      setError(null);
      setLoading(true);

      try {
        // Create or fetch editor session for the generation
        const response = await fetch('/api/editor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generationId: genId }),
        });

        if (!response.ok) {
          throw new Error('Failed to load editor session');
        }

        const sessionData = await response.json();

        loadFromGeneration({
          sessionId: sessionData.id,
          generationId: genId,
          homepage: sessionData.homepage,
          products: sessionData.products,
          styles: sessionData.styles,
        });

        setGenerationId(genId);
        setViewState('editing');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load generation';
        setError(message);
        showToast(message, true);
      } finally {
        setIsLoading(false);
        setLoading(false);
      }
    },
    [loadFromGeneration, showToast, setLoading]
  );

  // Get shop and generationId from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop');
    const generationIdParam = params.get('generationId');

    if (shopParam) {
      setShop(shopParam);
    }

    // If generationId is present, load that generation into the editor
    if (generationIdParam && shopParam) {
      loadGeneration(generationIdParam);
    }
  }, [loadGeneration]);

  const handleSubmit = useCallback(
    async (url: string) => {
      if (!shop) {
        setError('Shop domain not found. Please reload the app from Shopify admin.');
        return;
      }

      setIsLoading(true);
      setError(null);
      setLoading(true);
      resetEditor();

      try {
        const response = await fetch(`/api/generate?shop=${encodeURIComponent(shop)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to start generation');
        }

        setGenerationId(data.generationId);
        setViewState('generating');
        showToast('Generation started!');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to start generation';
        setError(message);
        showToast(message, true);
      } finally {
        setIsLoading(false);
        setLoading(false);
      }
    },
    [shop, showToast, setLoading, resetEditor]
  );

  const handleGenerationComplete = useCallback(async () => {
    if (!generationId) return;

    // Create or fetch editor session
    try {
      const response = await fetch('/api/editor/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load editor');
      }

      // Load data into editor store
      loadFromGeneration({
        sessionId: data.id,
        generationId,
        homepage: data.homepage,
        products: data.products,
        styles: data.styles,
      });

      setViewState('editing');
      showToast('Content ready for editing!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load editor';
      setError(message);
      showToast(message, true);
    }
  }, [generationId, loadFromGeneration, showToast]);

  const handleGenerationError = useCallback(
    (errorMessage: string) => {
      showToast(errorMessage, true);
      setError(errorMessage);
    },
    [showToast]
  );

  const handleNewGeneration = useCallback(() => {
    setViewState('input');
    setGenerationId(null);
    setError(null);
    resetEditor();
  }, [resetEditor]);

  const handleImportSuccess = useCallback(
    (result: { themeName: string; productsCreated: number }) => {
      showToast(`Theme "${result.themeName}" created with ${result.productsCreated} products!`);
    },
    [showToast]
  );

  const handleImportError = useCallback(
    (errorMessage: string) => {
      showToast(errorMessage, true);
    },
    [showToast]
  );

  // Render the editor view
  if (viewState === 'editing' && shop) {
    return (
      <Frame>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--p-color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--p-color-bg)',
            }}
          >
            <BlockStack gap="100">
              <Text as="h1" variant="headingMd">
                Edit Your Store
              </Text>
              <Text as="p" tone="subdued">
                Make changes and preview before importing to Shopify
              </Text>
            </BlockStack>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Text as="span" tone="subdued" variant="bodySm">
                {isDirty ? 'Unsaved changes' : isSaving ? 'Saving...' : 'Saved'}
              </Text>
              <ImportButton
                shopDomain={shop}
                onSuccess={handleImportSuccess}
                onError={handleImportError}
              />
              <button
                onClick={handleNewGeneration}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--p-color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Start Over
              </button>
            </div>
          </div>
          <EditorLayout
            leftPanel={<LeftPanel isSaving={isSaving} isDirty={isDirty} />}
            rightPanel={<RightPanel shopDomain={shop} />}
          />
        </div>
      </Frame>
    );
  }

  // Render the standard Polaris page for input/generating states
  return (
    <Page
      title="Generate Store"
      backAction={{ content: 'Dashboard', url: '/dashboard' }}
      primaryAction={
        viewState === 'generating'
          ? { content: 'New Generation', onAction: handleNewGeneration }
          : undefined
      }
    >
      <Layout>
        {error && viewState === 'input' && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          {viewState === 'input' && (
            <GenerateForm onSubmit={handleSubmit} isLoading={isLoading} />
          )}
          {viewState === 'generating' && generationId && (
            <GenerationStatus
              generationId={generationId}
              shopDomain={shop || ''}
              onComplete={handleGenerationComplete}
              onError={handleGenerationError}
            />
          )}
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Banner>
              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">
                  Tips for best results:
                </Text>
                <Text as="p">
                  - Use the homepage URL for brand analysis
                </Text>
                <Text as="p">
                  - Ensure the site has visible products/services
                </Text>
                <Text as="p">
                  - Works best with e-commerce or portfolio sites
                </Text>
              </BlockStack>
            </Banner>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default function GeneratePage() {
  return (
    <AppBridgeProvider>
      <GeneratePageContent />
    </AppBridgeProvider>
  );
}
