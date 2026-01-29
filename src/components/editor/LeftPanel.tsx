'use client';

import { Box, BlockStack, Text, Badge, InlineStack } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { TabNavigation } from './tabs/TabNavigation';
import { HomepageTab } from './tabs/HomepageTab';
import { ProductsTab } from './tabs/ProductsTab';
import { StylesTab } from './tabs/StylesTab';
import { ProductPageTab } from './tabs/ProductPageTab';
import { ContactPageTab } from './tabs/ContactPageTab';
import styles from './LeftPanel.module.css';

interface LeftPanelProps {
  isSaving?: boolean;
  isDirty?: boolean;
}

export function LeftPanel({ isSaving, isDirty }: LeftPanelProps) {
  const { activeTab, activePage } = useEditorStore();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Content Editor
          </Text>
          <InlineStack gap="200">
            {isDirty && !isSaving && (
              <Badge tone="attention">Unsaved changes</Badge>
            )}
            {isSaving && <Badge>Saving...</Badge>}
          </InlineStack>
        </InlineStack>
      </div>

      <div className={styles.content}>
        {activePage === 'home' && (
          <>
            <TabNavigation />
            <div className={styles.tabContent}>
              {activeTab === 'homepage' && <HomepageTab />}
              {activeTab === 'products' && <ProductsTab />}
              {activeTab === 'styles' && <StylesTab />}
            </div>
          </>
        )}
        {activePage === 'product' && (
          <div className={styles.tabContent}>
            <ProductPageTab />
          </div>
        )}
        {activePage === 'contact' && (
          <div className={styles.tabContent}>
            <ContactPageTab />
          </div>
        )}
      </div>
    </div>
  );
}
