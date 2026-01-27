'use client';

import { BlockStack, Text, Button, EmptyState, Card } from '@shopify/polaris';
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
          Products ({products.length})
        </Text>
        <Text as="p" tone="subdued">
          Edit product details before importing to Shopify. Products will be created as drafts.
        </Text>
      </BlockStack>

      {products.length === 0 ? (
        <Card>
          <EmptyState
            heading="No products yet"
            action={{
              content: 'Add product',
              onAction: handleAddProduct,
            }}
            image=""
          >
            <p>Add products to import them to your Shopify store.</p>
          </EmptyState>
        </Card>
      ) : (
        <>
          <ProductList />
          <Button onClick={handleAddProduct}>Add Product</Button>
        </>
      )}
    </BlockStack>
  );
}
