'use client';

import { useState } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  TextField,
  Text,
  Button,
  Collapsible,
  Tag,
  Thumbnail,
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon, ImageIcon } from '@shopify/polaris-icons';
import { useEditorStore } from '@/stores/editorStore';
import { EditableProduct } from '@/types/editor';

interface ProductCardProps {
  product: EditableProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const { updateProduct, removeProduct } = useEditorStore();

  const handleAddTag = () => {
    if (newTag.trim() && !product.tags.includes(newTag.trim())) {
      updateProduct(product.id, {
        tags: [...product.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateProduct(product.id, {
      tags: product.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="300" blockAlign="center">
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant="plain"
              icon={isOpen ? ChevronUpIcon : ChevronDownIcon}
              accessibilityLabel={isOpen ? 'Collapse product' : 'Expand product'}
            />
            {product.imageUrl ? (
              <Thumbnail source={product.imageUrl} alt={product.title} size="small" />
            ) : (
              <Thumbnail source={ImageIcon} alt="" size="small" />
            )}
            <BlockStack gap="100">
              <Text as="span" fontWeight="semibold">
                {product.title}
              </Text>
              <Text as="span" tone="subdued" variant="bodySm">
                {formatPrice(product.price)}
              </Text>
            </BlockStack>
          </InlineStack>
          <Button
            onClick={() => removeProduct(product.id)}
            variant="plain"
            tone="critical"
            icon={DeleteIcon}
            accessibilityLabel="Delete product"
          />
        </InlineStack>

        <Collapsible open={isOpen} id={`product-${product.id}`}>
          <BlockStack gap="300">
            <TextField
              label="Title"
              value={product.title}
              onChange={(value) => updateProduct(product.id, { title: value })}
              autoComplete="off"
            />
            <TextField
              label="Description"
              value={product.description}
              onChange={(value) => updateProduct(product.id, { description: value })}
              multiline={4}
              autoComplete="off"
            />
            <TextField
              label="Price"
              type="number"
              value={product.price.toString()}
              onChange={(value) =>
                updateProduct(product.id, { price: parseFloat(value) || 0 })
              }
              prefix="$"
              autoComplete="off"
            />
            <TextField
              label="Image URL"
              value={product.imageUrl || ''}
              onChange={(value) =>
                updateProduct(product.id, { imageUrl: value || undefined })
              }
              type="url"
              autoComplete="off"
            />
            <TextField
              label="Vendor (optional)"
              value={product.vendor || ''}
              onChange={(value) =>
                updateProduct(product.id, { vendor: value || undefined })
              }
              autoComplete="off"
            />

            <BlockStack gap="200">
              <Text as="span" variant="bodySm">
                Tags
              </Text>
              <InlineStack gap="200" wrap>
                {product.tags.map((tag) => (
                  <Tag key={tag} onRemove={() => handleRemoveTag(tag)}>
                    {tag}
                  </Tag>
                ))}
              </InlineStack>
              <InlineStack gap="200">
                <div style={{ flex: 1 }}>
                  <TextField
                    label=""
                    labelHidden
                    value={newTag}
                    onChange={setNewTag}
                    placeholder="Add a tag"
                    autoComplete="off"
                    onKeyPress={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                  Add
                </Button>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}
