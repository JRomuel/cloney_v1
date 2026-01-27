import { ShopifyGraphQLClient } from './client';
import { ShopifyApiError } from '@/errors';

interface CollectionCreateResponse {
  collectionCreate: {
    collection: {
      id: string;
      handle: string;
      title: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

interface CollectionAddProductsResponse {
  collectionAddProducts: {
    collection: {
      id: string;
      productsCount: {
        count: number;
      };
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

const COLLECTION_CREATE_MUTATION = `
  mutation collectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        handle
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const COLLECTION_ADD_PRODUCTS_MUTATION = `
  mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection {
        id
        productsCount {
          count
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface CreateCollectionResult {
  id: string;
  handle: string;
  title: string;
}

/**
 * Create a new collection in Shopify
 */
export async function createCollection(
  client: ShopifyGraphQLClient,
  title: string,
  description?: string
): Promise<CreateCollectionResult> {
  const input = {
    title,
    descriptionHtml: description || `Products from ${title}`,
  };

  const response = await client.mutate<CollectionCreateResponse>(
    COLLECTION_CREATE_MUTATION,
    { input }
  );

  if (response.collectionCreate.userErrors.length > 0) {
    const errors = response.collectionCreate.userErrors
      .map((e) => e.message)
      .join(', ');
    throw new ShopifyApiError(`Failed to create collection: ${errors}`);
  }

  if (!response.collectionCreate.collection) {
    throw new ShopifyApiError('Collection creation returned no collection');
  }

  return {
    id: response.collectionCreate.collection.id,
    handle: response.collectionCreate.collection.handle,
    title: response.collectionCreate.collection.title,
  };
}

/**
 * Add products to an existing collection
 */
export async function addProductsToCollection(
  client: ShopifyGraphQLClient,
  collectionId: string,
  productIds: string[]
): Promise<void> {
  if (productIds.length === 0) return;

  const response = await client.mutate<CollectionAddProductsResponse>(
    COLLECTION_ADD_PRODUCTS_MUTATION,
    {
      id: collectionId,
      productIds,
    }
  );

  if (response.collectionAddProducts.userErrors.length > 0) {
    const errors = response.collectionAddProducts.userErrors
      .map((e) => e.message)
      .join(', ');
    throw new ShopifyApiError(`Failed to add products to collection: ${errors}`);
  }
}

/**
 * Create a collection and add products in one flow
 */
export async function createCollectionWithProducts(
  client: ShopifyGraphQLClient,
  title: string,
  productIds: string[],
  description?: string
): Promise<CreateCollectionResult> {
  // Create the collection
  const collection = await createCollection(client, title, description);

  // Add products to it
  if (productIds.length > 0) {
    await addProductsToCollection(client, collection.id, productIds);
  }

  return collection;
}
