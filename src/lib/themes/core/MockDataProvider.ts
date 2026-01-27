// Mock Shopify data provider for preview rendering

import type {
  ShopifyShop,
  ShopifyProduct,
  ShopifyCollection,
  ShopifySettings,
  ShopifyImage,
  ShopifyVariant,
  LiquidRenderContext,
} from '../types/theme.types';
import type { EditableProduct, StyleSettings } from '@/types/editor';

/**
 * Create a mock Shopify shop object
 */
export function createMockShop(name: string = 'My Store'): ShopifyShop {
  return {
    name,
    email: 'store@example.com',
    currency: 'USD',
    money_format: '${{amount}}',
    money_with_currency_format: '${{amount}} USD',
  };
}

/**
 * Create a mock Shopify image object
 */
export function createMockImage(
  src: string,
  alt: string = '',
  width: number = 600,
  height: number = 600
): ShopifyImage {
  return {
    src,
    alt,
    width,
    height,
  };
}

/**
 * Create a mock Shopify variant
 */
export function createMockVariant(
  id: number,
  title: string,
  price: number,
  available: boolean = true
): ShopifyVariant {
  return {
    id,
    title,
    price: price * 100, // Convert to cents
    available,
    sku: `SKU-${id}`,
  };
}

/**
 * Convert an editor product to a mock Shopify product
 */
export function editorProductToShopify(product: EditableProduct, index: number): ShopifyProduct {
  const handle = product.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const priceInCents = Math.round(product.price * 100);

  return {
    id: index + 1,
    title: product.title,
    handle,
    description: product.description,
    price: priceInCents,
    price_min: priceInCents,
    price_max: priceInCents,
    compare_at_price: undefined,
    featured_image: product.imageUrl
      ? createMockImage(product.imageUrl, product.title)
      : createMockImage('', product.title),
    images: product.imageUrl
      ? [createMockImage(product.imageUrl, product.title)]
      : [],
    vendor: product.vendor || 'Store',
    type: 'Product',
    tags: product.tags || [],
    available: true,
    url: `/products/${handle}`,
    variants: [createMockVariant(1, 'Default', product.price)],
  };
}

/**
 * Create a mock collection from editor products
 */
export function createMockCollection(
  title: string,
  products: EditableProduct[],
  handle: string = 'all'
): ShopifyCollection {
  const shopifyProducts = products.map((p, i) => editorProductToShopify(p, i));

  return {
    id: 1,
    title,
    handle,
    description: `Browse our ${title.toLowerCase()} collection`,
    image: undefined,
    products: shopifyProducts,
    products_count: shopifyProducts.length,
    url: `/collections/${handle}`,
  };
}

/**
 * Convert editor styles to Shopify settings
 */
export function editorStylesToSettings(styles: StyleSettings): ShopifySettings {
  return {
    colors_primary: styles.colors.primary,
    colors_secondary: styles.colors.secondary,
    colors_background: styles.colors.background,
    colors_text: styles.colors.text,
    colors_accent: styles.colors.accent,
    type_header_font: styles.typography.headingFont,
    type_body_font: styles.typography.bodyFont,
  };
}

/**
 * Create default Shopify settings
 */
export function createDefaultSettings(): ShopifySettings {
  return {
    colors_primary: '#121212',
    colors_secondary: '#666666',
    colors_background: '#ffffff',
    colors_text: '#121212',
    colors_accent: '#121212',
    type_header_font: 'Assistant',
    type_body_font: 'Assistant',
  };
}

interface BaseRenderContext {
  shop: ShopifyShop;
  settings: ShopifySettings;
  request: {
    host: string;
    path: string;
    locale: {
      iso_code: string;
    };
  };
  content_for_header: string;
}

/**
 * Create the base render context for Liquid templates
 */
export function createBaseRenderContext(
  shopName: string,
  settings: ShopifySettings
): BaseRenderContext {
  return {
    shop: createMockShop(shopName),
    settings,
    request: {
      host: 'preview.myshopify.com',
      path: '/',
      locale: {
        iso_code: 'en',
      },
    },
    content_for_header: '',
  };
}

/**
 * Create a complete render context for a page
 */
export function createPageRenderContext(
  shopName: string,
  settings: ShopifySettings,
  products: EditableProduct[]
): LiquidRenderContext {
  const collection = createMockCollection('All Products', products);
  const allProducts: Record<string, ShopifyProduct> = {};

  for (const product of collection.products) {
    allProducts[product.handle] = product;
  }

  return {
    ...createBaseRenderContext(shopName, settings),
    content_for_layout: '',
    section: {
      id: 'main',
      type: 'main',
      settings: {},
      blocks: [],
      block_order: [],
    },
    collection,
    collections: {
      all: collection,
    },
    all_products: allProducts,
  };
}

/**
 * Create section-specific context additions
 */
export function createSectionContext(
  sectionId: string,
  sectionType: string,
  settings: Record<string, unknown>,
  blocks: Array<{
    id: string;
    type: string;
    settings: Record<string, unknown>;
  }>
): { section: LiquidRenderContext['section'] } {
  return {
    section: {
      id: sectionId,
      type: sectionType,
      settings,
      blocks,
      block_order: blocks.map(b => b.id),
    },
  };
}
