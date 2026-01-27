'use client';

import { BlockStack, Text, EmptyState, Card } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { ProductList } from '../products/ProductList';

export function ProductsTab() {
  const { products, addProduct } = useEditorStore();

  const handleAddProduct = () => {
    addProduct({
      id: `product_${Date.now()}`,
      title: 'New Product',
      description: 'Enter a product description',
      price: 0,
      tags: [],
    });
  };

  return (
    <BlockStack gap="500">
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Product
        </Text>
        <Text as="p" tone="subdued">
          Edit your product details before importing to Shopify. The product will be created as a draft.
        </Text>
      </BlockStack>

      {products.length === 0 ? (
        <Card>
          <EmptyState
            heading="No product yet"
            action={{
              content: 'Add product',
              onAction: handleAddProduct,
            }}
            image=""
          >
            <p>Add a product to import to your Shopify store.</p>
          </EmptyState>
        </Card>
      ) : (
        <ProductList />
      )}
    </BlockStack>
  );
}
