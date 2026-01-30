'use client';

import {
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Badge,
  Collapsible,
  FormLayout,
  TextField,
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import {
  Section,
  FeaturesContent,
  TestimonialsContent,
  TextContent,
} from '@/types/editor';

export function ContactPageTab() {
  const {
    contactPage,
    updateContactHero,
    updateContactInfo,
    updateContactPageSection,
    removeContactPageSection,
  } = useEditorStore();

  return (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Page Header
          </Text>
          <FormLayout>
            <TextField
              label="Title"
              value={contactPage.hero.title}
              onChange={(value) => updateContactHero({ title: value })}
              autoComplete="off"
            />
            <TextField
              label="Subtitle"
              value={contactPage.hero.subtitle}
              onChange={(value) => updateContactHero({ subtitle: value })}
              multiline={2}
              autoComplete="off"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Contact Information
          </Text>
          <FormLayout>
            <TextField
              label="Email"
              value={contactPage.contactInfo.email}
              onChange={(value) => updateContactInfo({ email: value })}
              type="email"
              autoComplete="off"
            />
            <TextField
              label="Phone"
              value={contactPage.contactInfo.phone}
              onChange={(value) => updateContactInfo({ phone: value })}
              type="tel"
              autoComplete="off"
            />
            <TextField
              label="Address"
              value={contactPage.contactInfo.address}
              onChange={(value) => updateContactInfo({ address: value })}
              multiline={2}
              autoComplete="off"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm">
            Additional Sections
          </Text>
        </InlineStack>

        {contactPage.sections.length === 0 ? (
          <Card>
            <BlockStack gap="300" inlineAlign="center">
              <Text as="p" tone="subdued">
                No additional sections.
              </Text>
            </BlockStack>
          </Card>
        ) : (
          <BlockStack gap="400">
            {contactPage.sections.map((section, index) => (
              <ContactPageSectionEditor
                key={section.id}
                section={section}
                index={index}
                totalSections={contactPage.sections.length}
                onUpdate={(updates) => updateContactPageSection(section.id, updates)}
                onRemove={() => removeContactPageSection(section.id)}
              />
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </BlockStack>
  );
}

interface ContactPageSectionEditorProps {
  section: Section;
  index: number;
  totalSections: number;
  onUpdate: (updates: Partial<Section>) => void;
  onRemove: () => void;
}

function ContactPageSectionEditor({
  section,
  index,
  totalSections,
  onUpdate,
  onRemove,
}: ContactPageSectionEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          </InlineStack>
          <Button
            onClick={onRemove}
            variant="plain"
            tone="critical"
            icon={DeleteIcon}
            accessibilityLabel="Delete section"
          />
        </InlineStack>

        <Collapsible open={isOpen} id={`contact-section-${section.id}`}>
          <FormLayout>
            <TextField
              label="Section Title"
              value={section.title}
              onChange={(value) => onUpdate({ title: value })}
              autoComplete="off"
            />
            {section.type === 'features' && (
              <SimpleFeaturesEditor
                content={section.content as FeaturesContent}
                onUpdate={(content) => onUpdate({ content })}
              />
            )}
            {section.type === 'testimonials' && (
              <SimpleTestimonialsEditor
                content={section.content as TestimonialsContent}
                onUpdate={(content) => onUpdate({ content })}
              />
            )}
            {section.type === 'text' && (
              <SimpleTextEditor
                content={section.content as TextContent}
                onUpdate={(content) => onUpdate({ content })}
              />
            )}
          </FormLayout>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}

function SimpleFeaturesEditor({
  content,
  onUpdate,
}: {
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
              <Text as="span" variant="bodySm">Feature Item</Text>
              <Button onClick={() => removeItem(item.id)} variant="plain" tone="critical" size="slim">
                Remove
              </Button>
            </InlineStack>
            <TextField
              label="Title"
              value={item.title}
              onChange={(value) => updateItem(item.id, { title: value })}
              autoComplete="off"
            />
            <TextField
              label="Description"
              value={item.description}
              onChange={(value) => updateItem(item.id, { description: value })}
              multiline={2}
              autoComplete="off"
            />
          </BlockStack>
        </Card>
      ))}
      <Button onClick={addItem} variant="secondary">Add Feature</Button>
    </BlockStack>
  );
}

function SimpleTestimonialsEditor({
  content,
  onUpdate,
}: {
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
              <Text as="span" variant="bodySm">Testimonial</Text>
              <Button onClick={() => removeItem(item.id)} variant="plain" tone="critical" size="slim">
                Remove
              </Button>
            </InlineStack>
            <TextField
              label="Quote"
              value={item.quote}
              onChange={(value) => updateItem(item.id, { quote: value })}
              multiline={3}
              autoComplete="off"
            />
            <TextField
              label="Author"
              value={item.author}
              onChange={(value) => updateItem(item.id, { author: value })}
              autoComplete="off"
            />
          </BlockStack>
        </Card>
      ))}
      <Button onClick={addItem} variant="secondary">Add Testimonial</Button>
    </BlockStack>
  );
}

function SimpleTextEditor({
  content,
  onUpdate,
}: {
  content: TextContent;
  onUpdate: (content: TextContent) => void;
}) {
  return (
    <TextField
      label="Content"
      value={content.body}
      onChange={(value) => onUpdate({ body: value })}
      multiline={6}
      autoComplete="off"
    />
  );
}
