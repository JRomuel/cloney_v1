'use client';

import {
  Card,
  BlockStack,
  TextField,
  Text,
  Button,
  InlineStack,
  Badge,
  Collapsible,
  FormLayout,
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { FocusableTextField } from '../common/FocusableTextField';
import {
  Section,
  FeaturesContent,
  TestimonialsContent,
  GalleryContent,
  TextContent,
} from '@/types/editor';

interface SectionEditorProps {
  section: Section;
  index: number;
}

export function SectionEditor({ section, index }: SectionEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { updateSection, removeSection, toggleSectionEnabled, reorderSections, homepage } =
    useEditorStore();

  const canMoveUp = index > 0;
  const canMoveDown = index < homepage.sections.length - 1;

  const handleMoveUp = () => {
    if (canMoveUp) {
      reorderSections(index, index - 1);
    }
  };

  const handleMoveDown = () => {
    if (canMoveDown) {
      reorderSections(index, index + 1);
    }
  };

  const sectionTypeLabel = {
    features: 'Features',
    testimonials: 'Testimonials',
    gallery: 'Gallery',
    text: 'Text Block',
  }[section.type];

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant="plain"
              icon={isOpen ? ChevronUpIcon : ChevronDownIcon}
              accessibilityLabel={isOpen ? 'Collapse section' : 'Expand section'}
            />
            <Text as="span" fontWeight="semibold">
              {section.title}
            </Text>
            <Badge tone="info">{sectionTypeLabel}</Badge>
            {!section.enabled && <Badge tone="attention">Hidden</Badge>}
          </InlineStack>
          <InlineStack gap="100">
            <Button
              onClick={handleMoveUp}
              disabled={!canMoveUp}
              variant="plain"
              accessibilityLabel="Move up"
            >
              Up
            </Button>
            <Button
              onClick={handleMoveDown}
              disabled={!canMoveDown}
              variant="plain"
              accessibilityLabel="Move down"
            >
              Down
            </Button>
            <Button
              onClick={() => toggleSectionEnabled(section.id)}
              variant="plain"
            >
              {section.enabled ? 'Hide' : 'Show'}
            </Button>
            <Button
              onClick={() => removeSection(section.id)}
              variant="plain"
              tone="critical"
              icon={DeleteIcon}
              accessibilityLabel="Delete section"
            />
          </InlineStack>
        </InlineStack>

        <Collapsible open={isOpen} id={`section-${section.id}`}>
          <FormLayout>
            <FocusableTextField
              label="Section Title"
              value={section.title}
              onChange={(value) => updateSection(section.id, { title: value })}
              autoComplete="off"
              focusTarget={{ type: 'section', field: 'title', itemId: section.id }}
            />
            {section.type === 'features' && (
              <FeaturesEditor
                sectionId={section.id}
                content={section.content as FeaturesContent}
                onUpdate={(content) => updateSection(section.id, { content })}
              />
            )}
            {section.type === 'testimonials' && (
              <TestimonialsEditor
                sectionId={section.id}
                content={section.content as TestimonialsContent}
                onUpdate={(content) => updateSection(section.id, { content })}
              />
            )}
            {section.type === 'gallery' && (
              <GalleryEditor
                sectionId={section.id}
                content={section.content as GalleryContent}
                onUpdate={(content) => updateSection(section.id, { content })}
              />
            )}
            {section.type === 'text' && (
              <TextEditor
                sectionId={section.id}
                content={section.content as TextContent}
                onUpdate={(content) => updateSection(section.id, { content })}
              />
            )}
          </FormLayout>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}

// Features Editor
function FeaturesEditor({
  sectionId,
  content,
  onUpdate,
}: {
  sectionId: string;
  content: FeaturesContent;
  onUpdate: (content: FeaturesContent) => void;
}) {
  const addItem = () => {
    onUpdate({
      items: [
        ...content.items,
        {
          id: `feature_${Date.now()}`,
          title: 'New Feature',
          description: 'Feature description',
        },
      ],
    });
  };

  const updateItem = (itemId: string, updates: Partial<FeaturesContent['items'][0]>) => {
    onUpdate({
      items: content.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  };

  const removeItem = (itemId: string) => {
    onUpdate({
      items: content.items.filter((item) => item.id !== itemId),
    });
  };

  return (
    <BlockStack gap="300">
      {content.items.map((item) => (
        <Card key={item.id}>
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="span" variant="bodySm">
                Feature Item
              </Text>
              <Button
                onClick={() => removeItem(item.id)}
                variant="plain"
                tone="critical"
                size="slim"
              >
                Remove
              </Button>
            </InlineStack>
            <FocusableTextField
              label="Title"
              value={item.title}
              onChange={(value) => updateItem(item.id, { title: value })}
              autoComplete="off"
              focusTarget={{ type: 'section', field: 'title', itemId: sectionId, subItemId: item.id }}
            />
            <FocusableTextField
              label="Description"
              value={item.description}
              onChange={(value) => updateItem(item.id, { description: value })}
              multiline={2}
              autoComplete="off"
              focusTarget={{ type: 'section', field: 'description', itemId: sectionId, subItemId: item.id }}
            />
          </BlockStack>
        </Card>
      ))}
      <Button onClick={addItem} variant="secondary">
        Add Feature
      </Button>
    </BlockStack>
  );
}

// Testimonials Editor
function TestimonialsEditor({
  sectionId,
  content,
  onUpdate,
}: {
  sectionId: string;
  content: TestimonialsContent;
  onUpdate: (content: TestimonialsContent) => void;
}) {
  const addItem = () => {
    onUpdate({
      items: [
        ...content.items,
        {
          id: `testimonial_${Date.now()}`,
          quote: 'Customer testimonial',
          author: 'Customer Name',
        },
      ],
    });
  };

  const updateItem = (itemId: string, updates: Partial<TestimonialsContent['items'][0]>) => {
    onUpdate({
      items: content.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  };

  const removeItem = (itemId: string) => {
    onUpdate({
      items: content.items.filter((item) => item.id !== itemId),
    });
  };

  return (
    <BlockStack gap="300">
      {content.items.map((item) => (
        <Card key={item.id}>
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="span" variant="bodySm">
                Testimonial
              </Text>
              <Button
                onClick={() => removeItem(item.id)}
                variant="plain"
                tone="critical"
                size="slim"
              >
                Remove
              </Button>
            </InlineStack>
            <FocusableTextField
              label="Quote"
              value={item.quote}
              onChange={(value) => updateItem(item.id, { quote: value })}
              multiline={3}
              autoComplete="off"
              focusTarget={{ type: 'section', field: 'quote', itemId: sectionId, subItemId: item.id }}
            />
            <FocusableTextField
              label="Author"
              value={item.author}
              onChange={(value) => updateItem(item.id, { author: value })}
              autoComplete="off"
              focusTarget={{ type: 'section', field: 'author', itemId: sectionId, subItemId: item.id }}
            />
            <TextField
              label="Role (optional)"
              value={item.role || ''}
              onChange={(value) => updateItem(item.id, { role: value || undefined })}
              autoComplete="off"
            />
          </BlockStack>
        </Card>
      ))}
      <Button onClick={addItem} variant="secondary">
        Add Testimonial
      </Button>
    </BlockStack>
  );
}

// Gallery Editor
function GalleryEditor({
  sectionId,
  content,
  onUpdate,
}: {
  sectionId: string;
  content: GalleryContent;
  onUpdate: (content: GalleryContent) => void;
}) {
  const addItem = () => {
    onUpdate({
      items: [
        ...content.items,
        {
          id: `gallery_${Date.now()}`,
          src: '',
          alt: 'Image description',
        },
      ],
    });
  };

  const updateItem = (itemId: string, updates: Partial<GalleryContent['items'][0]>) => {
    onUpdate({
      items: content.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  };

  const removeItem = (itemId: string) => {
    onUpdate({
      items: content.items.filter((item) => item.id !== itemId),
    });
  };

  return (
    <BlockStack gap="300">
      {content.items.map((item) => (
        <Card key={item.id}>
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="span" variant="bodySm">
                Gallery Image
              </Text>
              <Button
                onClick={() => removeItem(item.id)}
                variant="plain"
                tone="critical"
                size="slim"
              >
                Remove
              </Button>
            </InlineStack>
            <TextField
              label="Image URL"
              value={item.src}
              onChange={(value) => updateItem(item.id, { src: value })}
              type="url"
              autoComplete="off"
            />
            <TextField
              label="Alt Text"
              value={item.alt}
              onChange={(value) => updateItem(item.id, { alt: value })}
              autoComplete="off"
            />
            <TextField
              label="Caption (optional)"
              value={item.caption || ''}
              onChange={(value) => updateItem(item.id, { caption: value || undefined })}
              autoComplete="off"
            />
          </BlockStack>
        </Card>
      ))}
      <Button onClick={addItem} variant="secondary">
        Add Image
      </Button>
    </BlockStack>
  );
}

// Text Editor
function TextEditor({
  sectionId,
  content,
  onUpdate,
}: {
  sectionId: string;
  content: TextContent;
  onUpdate: (content: TextContent) => void;
}) {
  return (
    <FocusableTextField
      label="Content"
      value={content.body}
      onChange={(value) => onUpdate({ body: value })}
      multiline={6}
      autoComplete="off"
      helpText="Enter your text content here. Supports basic formatting."
      focusTarget={{ type: 'section', field: 'body', itemId: sectionId }}
    />
  );
}
