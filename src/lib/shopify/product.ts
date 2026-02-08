import { ShopifyGraphQLClient } from './client';
import { GeneratedProduct } from '@/types';
import { ShopifyApiError } from '@/errors';

interface ProductCreateResponse {
  productCreate: {
    product: {
      id: string;
      title: string;
      handle: string;
      status: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

interface ProductSetResponse {
  productSet: {
    product: {
      id: string;
      title: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
      code: string;
    }>;
  };
}

const PRODUCT_CREATE_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_SET_MUTATION = `
  mutation productSet($input: ProductSetInput!) {
    productSet(input: $input) {
      product {
        id
        title
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export interface CreateProductResult {
  id: string;
  title: string;
  handle?: string;
}

export async function createProduct(
  client: ShopifyGraphQLClient,
  product: GeneratedProduct
): Promise<CreateProductResult> {
  const input = {
    title: product.title,
    descriptionHtml: formatDescription(product.description),
    vendor: product.vendor || 'Cloney Generated',
    productType: product.productType || 'General',
    tags: product.tags || [],
    status: 'ACTIVE', // Create as active, visible in store
  };

  const response = await client.mutate<ProductCreateResponse>(
    PRODUCT_CREATE_MUTATION,
    { input }
  );

  if (response.productCreate.userErrors.length > 0) {
    const errors = response.productCreate.userErrors
      .map((e) => e.message)
      .join(', ');
    throw new ShopifyApiError(`Failed to create product: ${errors}`);
  }

  if (!response.productCreate.product) {
    throw new ShopifyApiError('Product creation returned no product');
  }

  return {
    id: response.productCreate.product.id,
    title: response.productCreate.product.title,
    handle: response.productCreate.product.handle,
  };
}

export async function createProductWithVariant(
  client: ShopifyGraphQLClient,
  product: GeneratedProduct
): Promise<CreateProductResult> {
  // Using productSet for creating product with variant in one operation
  const input = {
    title: product.title,
    descriptionHtml: formatDescription(product.description),
    vendor: product.vendor || 'Cloney Generated',
    productType: product.productType || 'General',
    tags: product.tags || [],
    status: 'ACTIVE',
    productOptions: [
      {
        name: 'Title',
        values: [{ name: 'Default Title' }],
      },
    ],
    variants: [
      {
        optionValues: [{ optionName: 'Title', name: 'Default Title' }],
        price: product.price.toFixed(2),
      },
    ],
  };

  const response = await client.mutate<ProductSetResponse>(
    PRODUCT_SET_MUTATION,
    { input }
  );

  if (response.productSet.userErrors.length > 0) {
    const errors = response.productSet.userErrors
      .map((e) => e.message)
      .join(', ');
    throw new ShopifyApiError(`Failed to create product: ${errors}`);
  }

  if (!response.productSet.product) {
    throw new ShopifyApiError('Product creation returned no product');
  }

  return {
    id: response.productSet.product.id,
    title: response.productSet.product.title,
  };
}

export async function createProducts(
  client: ShopifyGraphQLClient,
  products: GeneratedProduct[]
): Promise<CreateProductResult[]> {
  const results: CreateProductResult[] = [];
  const errors: string[] = [];

  for (const product of products) {
    try {
      // Try productSet first (creates with variant), fallback to productCreate
      let result: CreateProductResult;
      try {
        result = await createProductWithVariant(client, product);
      } catch {
        // Fallback to basic product creation
        result = await createProduct(client, product);
      }
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${product.title}: ${message}`);
      console.error(`Failed to create product "${product.title}":`, error);
    }
  }

  // If all products failed, throw an error
  if (results.length === 0 && errors.length > 0) {
    throw new ShopifyApiError(`All products failed to create: ${errors.join('; ')}`);
  }

  // Log any partial failures
  if (errors.length > 0) {
    console.warn(`Some products failed to create: ${errors.join('; ')}`);
  }

  return results;
}

function formatDescription(description: string): string {
  // Convert plain text to basic HTML
  if (!description) return '';

  // If already contains HTML tags, return as-is
  if (/<[^>]+>/.test(description)) {
    return description;
  }

  // Convert newlines to paragraphs
  const paragraphs = description
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim()}</p>`)
    .join('\n');

  return paragraphs || `<p>${description}</p>`;
}

// Query to get available publications (sales channels)
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

// Mutation to publish a product to sales channels
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
 * Publish a product to the Online Store sales channel.
 * This makes the product visible on the storefront.
 * Non-blocking on failure - logs warning and returns false.
 */
export async function publishProductToOnlineStore(
  client: ShopifyGraphQLClient,
  productId: string
): Promise<boolean> {
  try {
    // First, get available publications to find Online Store
    const pubResponse = await client.query<PublicationsQueryResponse>(PUBLICATIONS_QUERY);

    const publications = pubResponse.publications.nodes;
    const onlineStore = publications.find(
      (p) => p.name === 'Online Store' || p.name.toLowerCase().includes('online store')
    );

    if (!onlineStore) {
      console.warn(`[Product] Online Store publication not found. Available: ${publications.map(p => p.name).join(', ')}`);
      return false;
    }

    // Publish the product to Online Store
    const response = await client.mutate<PublishablePublishResponse>(
      PUBLISHABLE_PUBLISH_MUTATION,
      {
        id: productId,
        input: [{ publicationId: onlineStore.id }],
      }
    );

    if (response.publishablePublish.userErrors.length > 0) {
      const errors = response.publishablePublish.userErrors
        .map((e) => e.message)
        .join(', ');
      console.warn(`[Product] Failed to publish product ${productId} to Online Store: ${errors}`);
      return false;
    }

    console.log(`[Product] Published product ${productId} to Online Store`);
    return true;
  } catch (error) {
    console.warn(
      `[Product] Error publishing product ${productId}:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

// Mutation to add images to a product
const PRODUCT_CREATE_MEDIA_MUTATION = `
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        ... on MediaImage {
          id
          status
        }
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

interface ProductCreateMediaResponse {
  productCreateMedia: {
    media: Array<{
      id: string;
      status: string;
    }> | null;
    mediaUserErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

/**
 * Add images to a product from external URLs.
 * Shopify will fetch and host the images automatically.
 * Non-blocking on failure - logs warnings but continues.
 */
export async function addImagesToProduct(
  client: ShopifyGraphQLClient,
  productId: string,
  imageUrls: string[]
): Promise<{ added: number; failed: number }> {
  if (!imageUrls || imageUrls.length === 0) {
    return { added: 0, failed: 0 };
  }

  // Filter to valid URLs only
  const validUrls = imageUrls.filter(url => {
    try {
      new URL(url);
      return true;
    } catch {
      console.warn(`[Product] Invalid image URL skipped: ${url}`);
      return false;
    }
  });

  if (validUrls.length === 0) {
    return { added: 0, failed: 0 };
  }

  try {
    const media = validUrls.map(url => ({
      originalSource: url,
      mediaContentType: 'IMAGE' as const,
    }));

    const response = await client.mutate<ProductCreateMediaResponse>(
      PRODUCT_CREATE_MEDIA_MUTATION,
      { productId, media }
    );

    if (response.productCreateMedia.mediaUserErrors.length > 0) {
      const errors = response.productCreateMedia.mediaUserErrors
        .map((e) => e.message)
        .join(', ');
      console.warn(`[Product] Some images failed to upload for ${productId}: ${errors}`);
    }

    const addedCount = response.productCreateMedia.media?.length || 0;
    const failedCount = validUrls.length - addedCount;

    console.log(`[Product] Added ${addedCount}/${validUrls.length} images to product ${productId}`);
    return { added: addedCount, failed: failedCount };
  } catch (error) {
    console.warn(
      `[Product] Failed to add images to product ${productId}:`,
      error instanceof Error ? error.message : error
    );
    return { added: 0, failed: validUrls.length };
  }
}
