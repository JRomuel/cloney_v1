'use client';

import { Card, BlockStack, TextField, Text, FormLayout } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';

export function HeroEditor() {
  const { homepage, updateHero } = useEditorStore();
  const { hero } = homepage;

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h3" variant="headingSm">
          Hero Section
        </Text>
        <FormLayout>
          <TextField
            label="Title"
            value={hero.title}
            onChange={(value) => updateHero({ title: value })}
            autoComplete="off"
          />
          <TextField
            label="Subtitle"
            value={hero.subtitle}
            onChange={(value) => updateHero({ subtitle: value })}
            multiline={2}
            autoComplete="off"
          />
          <TextField
            label="Button Text"
            value={hero.ctaText}
            onChange={(value) => updateHero({ ctaText: value })}
            autoComplete="off"
          />
          <TextField
            label="Button URL"
            value={hero.ctaUrl}
            onChange={(value) => updateHero({ ctaUrl: value })}
            type="url"
            autoComplete="off"
          />
          <TextField
            label="Background Image URL"
            value={hero.backgroundImage || ''}
            onChange={(value) => updateHero({ backgroundImage: value || undefined })}
            type="url"
            autoComplete="off"
            helpText="Optional. Leave empty for solid color background."
          />
        </FormLayout>
      </BlockStack>
    </Card>
  );
}
