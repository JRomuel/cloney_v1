'use client';

import { ButtonGroup, Button, InlineStack, Text, Box } from '@shopify/polaris';
import { DesktopIcon, MobileIcon } from '@shopify/polaris-icons';
import { useEditorStore } from '@/stores/editorStore';
import styles from './PreviewToolbar.module.css';

export function PreviewToolbar() {
  const { previewMode, setPreviewMode } = useEditorStore();

  return (
    <div className={styles.toolbar}>
      <InlineStack align="space-between" blockAlign="center">
        <Text as="span" variant="bodySm" tone="subdued">
          Live Preview
        </Text>
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
