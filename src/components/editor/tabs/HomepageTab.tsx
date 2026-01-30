'use client';

import { BlockStack, Text, InlineStack, Card } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { HeroEditor } from '../homepage/HeroEditor';
import { SectionEditor } from '../homepage/SectionEditor';

export function HomepageTab() {
  const { homepage } = useEditorStore();

  return (
    <BlockStack gap="500">
      <HeroEditor />

      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm">
            Sections
          </Text>
        </InlineStack>

        {homepage.sections.length === 0 ? (
          <Card>
            <BlockStack gap="300" inlineAlign="center">
              <Text as="p" tone="subdued">
                No sections yet.
              </Text>
            </BlockStack>
          </Card>
        ) : (
          <BlockStack gap="400">
            {homepage.sections.map((section, index) => (
              <SectionEditor key={section.id} section={section} index={index} />
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </BlockStack>
  );
}
