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
    status: 'DRAFT', // Create as draft, not active
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
    status: 'DRAFT',
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
