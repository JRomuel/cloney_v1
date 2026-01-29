'use client';

import { ButtonGroup, Button, InlineStack, Select, Text, Badge } from '@shopify/polaris';
import { DesktopIcon, MobileIcon } from '@shopify/polaris-icons';
import { useEditorStore } from '@/stores/editorStore';
import { useThemeStore } from '@/stores/themeStore';
import { EditorPage } from '@/types/editor';
import styles from './ThemePreviewToolbar.module.css';

const PAGE_OPTIONS = [
  { label: 'Home', value: 'home' },
  { label: 'Product', value: 'product' },
  { label: 'Contact', value: 'contact' },
];

export function ThemePreviewToolbar() {
  const { previewMode, setPreviewMode, activePage, setActivePage } = useEditorStore();
  const { availableThemes, activeThemeId } = useThemeStore();

  const selectedTheme = availableThemes.find(t => t.id === activeThemeId);
  const themeName = selectedTheme?.name || 'Theme';

  return (
    <div className={styles.toolbar}>
      <InlineStack align="space-between" blockAlign="center" gap="400">
        <InlineStack gap="300" blockAlign="center">
          <Select
            label="Page"
            labelHidden
            options={PAGE_OPTIONS}
            value={activePage}
            onChange={(value) => setActivePage(value as EditorPage)}
          />
          <Text as="span" variant="bodySm" tone="subdued">
            Theme: <Text as="span" variant="bodySm" fontWeight="semibold">{themeName}</Text>
          </Text>
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
