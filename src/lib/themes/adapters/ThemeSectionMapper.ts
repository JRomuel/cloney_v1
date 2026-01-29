// Theme Section Mapper Interface
// Provides theme-specific section mapping for preview rendering

import type { LiquidSection, ShopifyCollection } from '../types/theme.types';
import type { HeroContent, EditableProduct, Section } from '@/types/editor';

/**
 * Result of mapping a section
 */
export interface MappedSection {
  section: LiquidSection;
  sectionType: string;
  collection?: ShopifyCollection;
}

/**
 * Interface for theme-specific section mappers
 * Each theme implements this interface to map editor content
 * to its native section types and data structures
 */
export interface ThemeSectionMapper {
  /** Theme identifier */
  readonly themeId: string;

  /**
   * Map hero content to theme's hero section
   */
  mapHero(hero: HeroContent): MappedSection;

  /**
   * Map products to theme's product listing section
   */
  mapProducts(products: EditableProduct[], title?: string): MappedSection;

  /**
   * Map a generic editor section to theme section
   */
  mapEditorSection(section: Section): MappedSection | null;

  /**
   * Get the section type name for a given purpose
   */
  getSectionType(purpose: 'hero' | 'featuredCollection' | 'richText' | 'mainProduct'): string;
}

/**
 * Mapper class constructor type
 */
type MapperConstructor = new () => ThemeSectionMapper;

/**
 * Registry for theme section mappers
 * Allows dynamic registration of new theme mappers
 */
class SectionMapperRegistry {
  private mappers: Map<string, ThemeSectionMapper> = new Map();
  private mapperClasses: Map<string, MapperConstructor> = new Map();
  private defaultMapperId: string = 'dawn';

  /**
   * Register a mapper class for a theme
   * The mapper will be instantiated lazily when first requested
   */
  register(themeId: string, MapperClass: MapperConstructor): void {
    this.mapperClasses.set(themeId, MapperClass);
    // Clear cached instance if re-registering
    this.mappers.delete(themeId);
  }

  /**
   * Get or create a mapper for a theme
   * Falls back to default mapper if theme has no registered mapper
   */
  get(themeId: string): ThemeSectionMapper {
    // Check cached instance
    if (this.mappers.has(themeId)) {
      return this.mappers.get(themeId)!;
    }

    // Check registered class
    if (this.mapperClasses.has(themeId)) {
      const MapperClass = this.mapperClasses.get(themeId)!;
      const instance = new MapperClass();
      this.mappers.set(themeId, instance);
      return instance;
    }

    // Fall back to default mapper (Dawn)
    // This ensures new themes work with Dawn-compatible sections
    console.warn(
      `No section mapper registered for theme "${themeId}". ` +
      `Using "${this.defaultMapperId}" mapper. To use native sections, ` +
      `create a mapper class and register it with registerSectionMapper().`
    );
    return this.get(this.defaultMapperId);
  }

  /**
   * Check if a theme has a registered mapper
   */
  has(themeId: string): boolean {
    return this.mapperClasses.has(themeId);
  }

  /**
   * Set the default mapper to use for unregistered themes
   */
  setDefault(themeId: string): void {
    if (!this.mapperClasses.has(themeId)) {
      throw new Error(`Cannot set default mapper: theme "${themeId}" is not registered`);
    }
    this.defaultMapperId = themeId;
  }

  /**
   * Clear all cached mapper instances (useful for testing)
   */
  clearCache(): void {
    this.mappers.clear();
  }

  /**
   * Get all registered theme IDs
   */
  getRegisteredThemes(): string[] {
    return Array.from(this.mapperClasses.keys());
  }
}

// Singleton registry instance
const registry = new SectionMapperRegistry();

// Register built-in mappers
// Using lazy loading pattern to avoid circular dependencies
let builtInMappersRegistered = false;

function ensureBuiltInMappers(): void {
  if (builtInMappersRegistered) return;
  builtInMappersRegistered = true;

  // Register Dawn mapper
  const { DawnSectionMapper } = require('./DawnSectionMapper');
  registry.register('dawn', DawnSectionMapper);

  // Register Tinker mapper
  const { TinkerSectionMapper } = require('./TinkerSectionMapper');
  registry.register('tinker', TinkerSectionMapper);
}

/**
 * Factory function to get the appropriate section mapper for a theme
 *
 * @example
 * // Get mapper for a theme
 * const mapper = getSectionMapper('tinker');
 * const heroMapping = mapper.mapHero(heroContent);
 */
export function getSectionMapper(themeId: string): ThemeSectionMapper {
  ensureBuiltInMappers();
  return registry.get(themeId);
}

/**
 * Register a custom section mapper for a theme
 *
 * @example
 * // In your theme's mapper file:
 * class MyThemeSectionMapper implements ThemeSectionMapper {
 *   readonly themeId = 'my-theme';
 *   // ... implement methods
 * }
 *
 * // Register it:
 * registerSectionMapper('my-theme', MyThemeSectionMapper);
 */
export function registerSectionMapper(themeId: string, MapperClass: MapperConstructor): void {
  ensureBuiltInMappers();
  registry.register(themeId, MapperClass);
}

/**
 * Check if a theme has a registered section mapper
 */
export function hasSectionMapper(themeId: string): boolean {
  ensureBuiltInMappers();
  return registry.has(themeId);
}

/**
 * Clear cached mapper instances (useful for testing)
 */
export function clearMapperCache(): void {
  registry.clearCache();
}

/**
 * Get all registered theme IDs that have section mappers
 */
export function getRegisteredMapperThemes(): string[] {
  ensureBuiltInMappers();
  return registry.getRegisteredThemes();
}
