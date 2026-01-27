'use client';

import { BlockStack, Text, Card, FormLayout } from '@shopify/polaris';
import { ColorPicker } from '../styles/ColorPicker';
import { FontSelector } from '../styles/FontSelector';
import { useEditorStore } from '@/stores/editorStore';

export function StylesTab() {
  const { styles, updateColor, updateFont } = useEditorStore();

  return (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Colors
          </Text>
          <FormLayout>
            <ColorPicker
              label="Primary"
              value={styles.colors.primary}
              onChange={(value) => updateColor('primary', value)}
              helpText="Main brand color for buttons and accents"
            />
            <ColorPicker
              label="Secondary"
              value={styles.colors.secondary}
              onChange={(value) => updateColor('secondary', value)}
              helpText="Supporting color for secondary elements"
            />
            <ColorPicker
              label="Background"
              value={styles.colors.background}
              onChange={(value) => updateColor('background', value)}
              helpText="Page background color"
            />
            <ColorPicker
              label="Text"
              value={styles.colors.text}
              onChange={(value) => updateColor('text', value)}
              helpText="Main text color"
            />
            <ColorPicker
              label="Accent"
              value={styles.colors.accent}
              onChange={(value) => updateColor('accent', value)}
              helpText="Accent color for links and highlights"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Typography
          </Text>
          <FormLayout>
            <FontSelector
              label="Heading Font"
              value={styles.typography.headingFont}
              onChange={(value) => updateFont('headingFont', value)}
            />
            <FontSelector
              label="Body Font"
              value={styles.typography.bodyFont}
              onChange={(value) => updateFont('bodyFont', value)}
            />
          </FormLayout>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
