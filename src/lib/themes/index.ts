// Theme system exports

// Core modules
export { LiquidEngine, getLiquidEngine } from './core/LiquidEngine';
export { ThemeLoader, getThemeLoader } from './core/ThemeLoader';
export { TemplateCache, templateCache } from './core/TemplateCache';
export { ThemeRegistry, getThemeRegistry, initializeDefaultTheme } from './core/ThemeRegistry';

// Server-side packager (for API routes)
export { ThemePackager, getThemePackager } from './ThemePackager';
export type { ThemeFile } from './ThemePackager';
export {
  createMockShop,
  createMockImage,
  createMockVariant,
  createMockCollection,
  editorProductToShopify,
  editorStylesToSettings,
  createDefaultSettings,
  createBaseRenderContext,
  createPageRenderContext,
  createSectionContext,
} from './core/MockDataProvider';

// Adapters
export {
  mapHeroToImageBanner,
  mapFeaturesToMulticolumn,
  mapTestimonialsToMulticolumn,
  mapGalleryToMulticolumn,
  mapTextToRichText,
  mapProductsToFeaturedCollection,
  mapHeader,
  mapFooter,
  mapEditorSection,
  mapAllContent,
} from './adapters/SectionMapper';

// Types
export type {
  ThemeConfig,
  ThemeManifest,
  SectionDefinition,
  ThemeSettingsSchema,
  ColorSettingDefinition,
  TypographySettingDefinition,
  ShopifyShop,
  ShopifyImage,
  ShopifyProduct,
  ShopifyVariant,
  ShopifyCollection,
  ShopifySettings,
  SectionBlock,
  SectionSettings,
  LiquidSection,
  LiquidRenderContext,
  UpdateType,
  UpdateEvent,
} from './types/theme.types';
