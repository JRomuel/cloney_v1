'use client';

import { Card, BlockStack, Text, FormLayout } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { FocusableTextField } from '../common/FocusableTextField';

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
          <FocusableTextField
            label="Title"
            value={hero.title}
            onChange={(value) => updateHero({ title: value })}
            autoComplete="off"
            focusTarget={{ type: 'hero', field: 'title' }}
          />
          <FocusableTextField
            label="Subtitle"
            value={hero.subtitle}
            onChange={(value) => updateHero({ subtitle: value })}
            multiline={2}
            autoComplete="off"
            focusTarget={{ type: 'hero', field: 'subtitle' }}
          />
          <FocusableTextField
            label="Button Text"
            value={hero.ctaText}
            onChange={(value) => updateHero({ ctaText: value })}
            autoComplete="off"
            focusTarget={{ type: 'hero', field: 'ctaText' }}
          />
          <FocusableTextField
            label="Button URL"
            value={hero.ctaUrl}
            onChange={(value) => updateHero({ ctaUrl: value })}
            type="url"
            autoComplete="off"
            focusTarget={{ type: 'hero', field: 'ctaUrl' }}
          />
          <FocusableTextField
            label="Background Image URL"
            value={hero.backgroundImage || ''}
            onChange={(value) => updateHero({ backgroundImage: value || undefined })}
            type="url"
            autoComplete="off"
            helpText="Optional. Leave empty for solid color background."
            focusTarget={{ type: 'hero', field: 'backgroundImage' }}
          />
        </FormLayout>
      </BlockStack>
    </Card>
  );
}
