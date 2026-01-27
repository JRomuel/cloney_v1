'use client';

import { BlockStack, Text, Button, InlineStack, Card } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { HeroEditor } from '../homepage/HeroEditor';
import { SectionEditor } from '../homepage/SectionEditor';
import { Section } from '@/types/editor';

export function HomepageTab() {
  const { homepage, addSection } = useEditorStore();

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
                No sections yet. Add a section to customize your homepage.
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

        <InlineStack gap="200">
          <Button onClick={() => addSection('features')} variant="secondary">
            + Features
          </Button>
          <Button onClick={() => addSection('testimonials')} variant="secondary">
            + Testimonials
          </Button>
          <Button onClick={() => addSection('gallery')} variant="secondary">
            + Gallery
          </Button>
          <Button onClick={() => addSection('text')} variant="secondary">
            + Text
          </Button>
        </InlineStack>
      </BlockStack>
    </BlockStack>
  );
}
