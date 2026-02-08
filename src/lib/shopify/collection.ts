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

const PUBLICATIONS_QUERY = `
  query publications {
    publications(first: 10) {
      nodes {
        id
        name
      }
    }
  }
`;

const PUBLISHABLE_PUBLISH_MUTATION = `
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable {
        availablePublicationsCount {
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

interface PublicationsQueryResponse {
  publications: {
    nodes: Array<{
      id: string;
      name: string;
    }>;
  };
}

interface PublishablePublishResponse {
  publishablePublish: {
    publishable: {
      availablePublicationsCount: {
        count: number;
      };
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

/**
 * Publish a collection to the Online Store sales channel.
 * This makes the collection visible on the storefront.
 * Non-blocking on failure - logs warning and returns false.
 */
export async function publishCollectionToOnlineStore(
  client: ShopifyGraphQLClient,
  collectionId: string
): Promise<boolean> {
  try {
    const pubResponse = await client.query<PublicationsQueryResponse>(PUBLICATIONS_QUERY);

    const publications = pubResponse.publications.nodes;
    const onlineStore = publications.find(
      (p) => p.name === 'Online Store' || p.name.toLowerCase().includes('online store')
    );

    if (!onlineStore) {
      console.warn(`[Collection] Online Store publication not found. Available: ${publications.map(p => p.name).join(', ')}`);
      return false;
    }

    const response = await client.mutate<PublishablePublishResponse>(
      PUBLISHABLE_PUBLISH_MUTATION,
      {
        id: collectionId,
        input: [{ publicationId: onlineStore.id }],
      }
    );

    if (response.publishablePublish.userErrors.length > 0) {
      const errors = response.publishablePublish.userErrors
        .map((e) => e.message)
        .join(', ');
      console.warn(`[Collection] Failed to publish collection ${collectionId} to Online Store: ${errors}`);
      return false;
    }

    console.log(`[Collection] Published collection ${collectionId} to Online Store`);
    return true;
  } catch (error) {
    console.warn(
      `[Collection] Error publishing collection ${collectionId}:`,
      error instanceof Error ? error.message : error
    );
    return false;
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
