'use client';

import { BlockStack } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { ProductCard } from './ProductCard';

export function ProductList() {
  const { products } = useEditorStore();

  return (
    <BlockStack gap="400">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </BlockStack>
  );
}
