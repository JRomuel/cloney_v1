'use client';

import { useEffect } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Box,
} from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { useThemeStore } from '@/stores/themeStore';
import { getThemeRegistry } from '@/lib/themes/core/ThemeRegistry';

interface ThemeSelectorProps {
  onContinue: () => void;
}

export function ThemeSelector({ onContinue }: ThemeSelectorProps) {
  const { selectedThemeId, setSelectedThemeId } = useEditorStore();
  const { availableThemes, setAvailableThemes, isInitialized, setInitialized } = useThemeStore();

  // Load available themes from registry on mount
  useEffect(() => {
    if (!isInitialized) {
      const registry = getThemeRegistry();
      const themes = registry.getAllThemes();
      setAvailableThemes(themes);
      setInitialized(true);
    }
  }, [isInitialized, setAvailableThemes, setInitialized]);

  const handleThemeSelect = (themeId: string) => {
    setSelectedThemeId(themeId);
  };

  return (
    <Card>
      <BlockStack gap="500">
        <BlockStack gap="200">
          <Text as="h2" variant="headingLg">
            Choose Your Theme
          </Text>
          <Text as="p" tone="subdued">
            Select a Shopify theme to use for your store. You can preview and customize it after generation.
          </Text>
        </BlockStack>

        <InlineStack gap="400" align="center" blockAlign="start">
          {availableThemes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              style={{
                cursor: 'pointer',
                flex: '1',
                maxWidth: '300px',
              }}
            >
              <div
                style={{
                  border: selectedThemeId === theme.id
                    ? '2px solid var(--p-color-border-interactive-active)'
                    : '2px solid var(--p-color-border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--p-color-bg-surface)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: selectedThemeId === theme.id
                    ? '0 0 0 1px var(--p-color-border-interactive-active)'
                    : 'none',
                }}
              >
                {/* Theme Preview Image or Placeholder */}
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    backgroundColor: theme.id === 'dawn'
                      ? '#f6f6f7'
                      : '#fef6e4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Decorative elements to represent theme style */}
                  {theme.id === 'dawn' ? (
                    // Dawn - Light, minimal style
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: '120px',
                          height: '8px',
                          backgroundColor: '#333',
                          borderRadius: '4px',
                          marginBottom: '12px',
                        }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '4px',
                          }}
                        />
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          width: '80px',
                          height: '6px',
                          backgroundColor: '#ccc',
                          borderRadius: '3px',
                          marginTop: '12px',
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}
                      />
                    </div>
                  ) : (
                    // Tinker - Warm, playful style
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: '140px',
                          height: '10px',
                          background: 'linear-gradient(90deg, #f582ae, #8bd3dd)',
                          borderRadius: '5px',
                          marginBottom: '16px',
                        }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          gap: '10px',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '2px solid #f582ae',
                          }}
                        />
                        <div
                          style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '2px solid #8bd3dd',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          width: '100px',
                          height: '8px',
                          backgroundColor: '#f582ae',
                          borderRadius: '4px',
                          marginTop: '16px',
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Theme Info */}
                <div
                  style={{
                    padding: '16px',
                    borderTop: '1px solid var(--p-color-border)',
                  }}
                >
                  <BlockStack gap="100">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingMd" fontWeight="semibold">
                        {theme.name}
                      </Text>
                      {selectedThemeId === theme.id && (
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--p-color-bg-fill-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </InlineStack>
                    <Text as="p" tone="subdued" variant="bodySm">
                      {theme.id === 'dawn'
                        ? 'Clean, minimal design with excellent performance'
                        : 'Modern, playful design with warm aesthetics'}
                    </Text>
                    <Text as="p" tone="subdued" variant="bodySm">
                      v{theme.version}
                    </Text>
                  </BlockStack>
                </div>
              </div>
            </div>
          ))}
        </InlineStack>

        <Box paddingBlockStart="400">
          <InlineStack align="end">
            <Button
              variant="primary"
              onClick={onContinue}
              disabled={!selectedThemeId}
            >
              Continue with {availableThemes.find(t => t.id === selectedThemeId)?.name || 'Theme'}
            </Button>
          </InlineStack>
        </Box>
      </BlockStack>
    </Card>
  );
}
