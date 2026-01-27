import { z } from 'zod';

// Shopify Types
export interface ShopifySession {
  shop: string;
  accessToken: string;
  scopes: string[];
}

export interface ShopifyOAuthParams {
  shop: string;
  code: string;
  timestamp: string;
  state: string;
  hmac: string;
}

// Scraping Types
export const ScrapedDataSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  colors: z.array(z.string()),
  fonts: z.array(z.string()),
  headings: z.array(z.string()),
  images: z.array(z.object({
    src: z.string(),
    alt: z.string().optional(),
  })),
  products: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    price: z.string().optional(),
    imageUrl: z.string().optional(),
  })),
  bodyText: z.string().optional(),
  logoUrl: z.string().optional(),
});

export type ScrapedData = z.infer<typeof ScrapedDataSchema>;

// AI Generation Types
export const ThemeSettingsSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    text: z.string(),
    accent: z.string(),
  }),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string(),
  }),
  layout: z.object({
    headerStyle: z.enum(['logo_center', 'logo_left', 'menu_center']),
    footerStyle: z.enum(['minimal', 'detailed', 'links_only']),
  }),
  brandName: z.string(),
  tagline: z.string().optional(),
});

export type ThemeSettings = z.infer<typeof ThemeSettingsSchema>;

export const GeneratedProductSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number().positive(),
  tags: z.array(z.string()),
  imageUrl: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
});

export type GeneratedProduct = z.infer<typeof GeneratedProductSchema>;

export const AIResponseSchema = z.object({
  theme: ThemeSettingsSchema,
  products: z.array(GeneratedProductSchema),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// Generation Status Types
export type GenerationStatus =
  | 'pending'
  | 'scraping'
  | 'analyzing'
  | 'editing'
  | 'creating_theme'
  | 'creating_products'
  | 'completed'
  | 'failed';

// Re-export editor types
export * from './editor';

export interface GenerationProgress {
  id: string;
  status: GenerationStatus;
  progress: number;
  errorMessage?: string;
  themeId?: string;
  themeName?: string;
  productsCreated?: number;
}

// API Request/Response Types
export interface GenerateRequest {
  url: string;
}

export interface GenerateResponse {
  generationId: string;
  status: GenerationStatus;
}

// Webhook Types
export interface ShopifyWebhookPayload {
  shop_domain?: string;
  shop_id?: number;
  [key: string]: unknown;
}

export interface GDPRWebhookPayload {
  shop_domain: string;
  shop_id: number;
  customer?: {
    id: number;
    email: string;
    phone?: string;
  };
  orders_requested?: number[];
  data_request?: {
    id: number;
  };
}

// Shopify GraphQL Types
export interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export interface ShopifyProductCreateInput {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  variants?: Array<{
    price: string;
  }>;
}

export interface ShopifyThemeCreateInput {
  name: string;
  role?: 'UNPUBLISHED' | 'MAIN' | 'DEVELOPMENT';
  src?: string;
}
