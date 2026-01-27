'use client';

import { ButtonGroup, Button, InlineStack, Text, Select } from '@shopify/polaris';
import { DesktopIcon, MobileIcon } from '@shopify/polaris-icons';
import { useEditorStore } from '@/stores/editorStore';
import { useThemeStore } from '@/stores/themeStore';
import styles from './ThemePreviewToolbar.module.css';

export function ThemePreviewToolbar() {
  const { previewMode, setPreviewMode } = useEditorStore();
  const { activeThemeId, availableThemes, setActiveTheme, isLoading } = useThemeStore();

  // Theme options for the selector
  const themeOptions = availableThemes.map(theme => ({
    label: theme.name,
    value: theme.id,
  }));

  // Only show theme selector if there are multiple themes
  const showThemeSelector = availableThemes.length > 1;

  return (
    <div className={styles.toolbar}>
      <InlineStack align="space-between" blockAlign="center" gap="400">
        <InlineStack gap="300" blockAlign="center">
          <Text as="span" variant="bodySm" tone="subdued">
            Live Preview
          </Text>

          {showThemeSelector && (
            <div className={styles.themeSelector}>
              <Select
                label=""
                labelHidden
                options={themeOptions}
                value={activeThemeId}
                onChange={setActiveTheme}
                disabled={isLoading}
              />
            </div>
          )}
        </InlineStack>

        <ButtonGroup variant="segmented">
          <Button
            pressed={previewMode === 'desktop'}
            onClick={() => setPreviewMode('desktop')}
            icon={DesktopIcon}
            accessibilityLabel="Desktop view"
          >
            Desktop
          </Button>
          <Button
            pressed={previewMode === 'mobile'}
            onClick={() => setPreviewMode('mobile')}
            icon={MobileIcon}
            accessibilityLabel="Mobile view"
          >
            Mobile
          </Button>
        </ButtonGroup>
      </InlineStack>
    </div>
  );
}
