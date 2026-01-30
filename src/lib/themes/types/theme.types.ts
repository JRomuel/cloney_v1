// Theme configuration types for multi-theme support

export interface ThemeConfig {
  id: string;           // 'dawn'
  name: string;         // 'Shopify Dawn'
  version: string;      // '15.0.0'
  previewImage: string;
  source: 'bundled' | 'remote';
}

export interface SectionDefinition {
  type: string;         // 'image-banner'
  name: string;         // 'Image Banner'
  liquidFile: string;   // 'sections/image-banner.liquid'
  editorType: string;   // 'hero' - maps to editor section type
  cssFile?: string;     // Optional CSS file for the section
}

export interface ThemeManifest {
  config: ThemeConfig;
  sections: SectionDefinition[];
  layout: {
    theme: string;      // 'layout/theme.liquid'
    header: string;     // 'sections/header.liquid'
    footer: string;     // 'sections/footer.liquid'
  };
  snippets: string[];   // List of snippet files
  assets: {
    css: string[];      // CSS files to load
  };
  settingsSchema: ThemeSettingsSchema;
}

export interface ThemeSettingsSchema {
  colors: ColorSettingDefinition[];
  typography: TypographySettingDefinition[];
}

export interface ColorSettingDefinition {
  id: string;
  label: string;
  default: string;
  cssVariable: string;
}

export interface TypographySettingDefinition {
  id: string;
  label: string;
  default: string;
  cssVariable: string;
}

// Shopify mock data types
export interface ShopifyShop {
  name: string;
  email: string;
  currency: string;
  money_format: string;
  money_with_currency_format: string;
  customer_accounts_enabled?: boolean;
  products_count?: number;
}

export interface ShopifyImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ShopifyMedia {
  id: number;
  media_type: string;
  position: number;
  src: string;
  width: number;
  height: number;
  aspect_ratio: number;
  alt: string;
  preview_image?: {
    src: string;
    width: number;
    height: number;
    aspect_ratio: number;
  };
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  description: string;
  price: number;
  price_min: number;
  price_max: number;
  compare_at_price?: number | null;
  compare_at_price_min?: number | null;
  compare_at_price_max?: number | null;
  featured_image: ShopifyImage | null;
  // featured_media is used by Dawn's card-product template for product card images
  featured_media?: ShopifyMedia | null;
  images: ShopifyImage[];
  media?: ShopifyMedia[];
  vendor: string;
  type: string;
  tags: string[];
  available: boolean;
  url: string;
  variants: ShopifyVariant[];
  // Selected/available variant references
  selected_or_first_available_variant?: ShopifyVariant;
  first_available_variant?: ShopifyVariant;
  // Variant options
  has_only_default_variant?: boolean;
  options?: unknown[];
  options_with_values?: unknown[];
  // B2B pricing
  quantity_price_breaks_configured?: boolean;
  // Price variation flags (for products with multiple variant prices)
  price_varies?: boolean;
  compare_at_price_varies?: boolean;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: number;
  compare_at_price?: number | null;
  available: boolean;
  sku: string;
  requires_shipping?: boolean;
  taxable?: boolean;
  inventory_quantity?: number;
  inventory_management?: string;
  inventory_policy?: string;
  featured_image?: ShopifyImage | null;
  quantity_rule?: {
    min: number;
    max: number | null;
    increment: number;
  };
}

export interface ShopifyCollectionSortOption {
  name: string;
  value: string;
}

export interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  description: string;
  image?: ShopifyImage;
  featured_image?: ShopifyImage | null;
  products: ShopifyProduct[];
  products_count: number;
  all_products_count?: number;
  // Filter-related properties
  all_tags?: string[];
  all_types?: string[];
  all_vendors?: string[];
  // Sorting options
  default_sort_by?: string;
  sort_by?: string;
  sort_options?: ShopifyCollectionSortOption[];
  // Filters (for Shopify Online Store 2.0)
  filters?: unknown[];
  url: string;
}

export interface ShopifyColorRgb {
  red: number;
  green: number;
  blue: number;
  rgb: string;
}

export interface ShopifyColorScheme {
  id: string;
  settings: {
    background: ShopifyColorRgb;
    background_gradient: string;
    text: ShopifyColorRgb;
    shadow: ShopifyColorRgb;
    button: ShopifyColorRgb;
    button_label: ShopifyColorRgb;
    secondary_button_label: ShopifyColorRgb;
  };
}

export interface ShopifyFont {
  family: string;
  fallback_families: string;
  style: string;
  weight: string;
  system: boolean;
}

export interface ShopifySettings {
  colors_primary: string;
  colors_secondary: string;
  colors_background: string;
  colors_text: string;
  colors_accent: string;
  type_header_font: ShopifyFont | string;
  type_body_font: ShopifyFont | string;
  color_schemes?: ShopifyColorScheme[];
  // Allow additional settings used by Dawn theme
  [key: string]: unknown;
}

// Section block types for Liquid templates
export interface SectionBlock {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  name?: string;
  static?: boolean;
  // Nested blocks support (used by Tinker theme)
  blocks?: Record<string, SectionBlock>;
  block_order?: string[];
}

export interface SectionSettings {
  [key: string]: unknown;
}

export interface LiquidSection {
  id: string;
  type: string;
  settings: SectionSettings;
  blocks: SectionBlock[] | Record<string, SectionBlock>;  // Support both array (Dawn) and object (Tinker) formats
  block_order: string[];
}

// Render context passed to Liquid templates
export interface LiquidRenderContext {
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
  content_for_layout: string;
  section: LiquidSection;
  product?: ShopifyProduct;
  collection?: ShopifyCollection;
  collections?: Record<string, ShopifyCollection>;
  all_products?: Record<string, ShopifyProduct>;
  // Section contexts for header/footer rendering via {% section %} tag
  sections?: Record<string, LiquidSection>;
  // Index signature for Record<string, unknown> compatibility
  [key: string]: unknown;
}

// Update strategy types
export type UpdateType = 'style' | 'content' | 'structural';

export interface UpdateEvent {
  type: UpdateType;
  sectionId?: string;
  changes: Record<string, unknown>;
}
