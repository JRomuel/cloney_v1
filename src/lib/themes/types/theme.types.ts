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
}

export interface ShopifyImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  description: string;
  price: number;
  price_min: number;
  price_max: number;
  compare_at_price?: number;
  featured_image: ShopifyImage;
  images: ShopifyImage[];
  vendor: string;
  type: string;
  tags: string[];
  available: boolean;
  url: string;
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: number;
  available: boolean;
  sku: string;
}

export interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  description: string;
  image?: ShopifyImage;
  products: ShopifyProduct[];
  products_count: number;
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
}

export interface SectionSettings {
  [key: string]: unknown;
}

export interface LiquidSection {
  id: string;
  type: string;
  settings: SectionSettings;
  blocks: SectionBlock[];
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
