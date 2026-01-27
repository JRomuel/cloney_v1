// Theme registry for managing multiple themes

import type { ThemeConfig, ThemeManifest } from '../types/theme.types';
import { ThemeLoader, getThemeLoader } from './ThemeLoader';
import { LiquidEngine, getLiquidEngine } from './LiquidEngine';

export interface RegisteredTheme {
  config: ThemeConfig;
  loader: ThemeLoader;
  engine: LiquidEngine;
  manifest: ThemeManifest | null;
  isLoaded: boolean;
}

export class ThemeRegistry {
  private themes: Map<string, RegisteredTheme> = new Map();
  private activeThemeId: string | null = null;

  /**
   * Register a bundled theme
   */
  registerTheme(themeId: string, config: ThemeConfig): void {
    if (this.themes.has(themeId)) {
      console.warn(`Theme ${themeId} is already registered`);
      return;
    }

    this.themes.set(themeId, {
      config,
      loader: getThemeLoader(themeId),
      engine: getLiquidEngine(themeId),
      manifest: null,
      isLoaded: false,
    });
  }

  /**
   * Load a theme's manifest and prepare it for rendering
   */
  async loadTheme(themeId: string): Promise<ThemeManifest> {
    const theme = this.themes.get(themeId);
    if (!theme) {
      throw new Error(`Theme ${themeId} is not registered`);
    }

    if (theme.isLoaded && theme.manifest) {
      return theme.manifest;
    }

    // Load manifest and essential templates
    const manifest = await theme.loader.loadManifest();
    await theme.loader.preloadEssentials();
    await theme.loader.loadAllCSS();

    theme.manifest = manifest;
    theme.isLoaded = true;

    return manifest;
  }

  /**
   * Set the active theme
   */
  async setActiveTheme(themeId: string): Promise<void> {
    if (!this.themes.has(themeId)) {
      throw new Error(`Theme ${themeId} is not registered`);
    }

    // Load the theme if not already loaded
    if (!this.themes.get(themeId)!.isLoaded) {
      await this.loadTheme(themeId);
    }

    this.activeThemeId = themeId;
  }

  /**
   * Get the active theme
   */
  getActiveTheme(): RegisteredTheme | null {
    if (!this.activeThemeId) return null;
    return this.themes.get(this.activeThemeId) || null;
  }

  /**
   * Get a theme by ID
   */
  getTheme(themeId: string): RegisteredTheme | null {
    return this.themes.get(themeId) || null;
  }

  /**
   * Get all registered themes
   */
  getAllThemes(): ThemeConfig[] {
    return Array.from(this.themes.values()).map(t => t.config);
  }

  /**
   * Check if a theme is registered
   */
  hasTheme(themeId: string): boolean {
    return this.themes.has(themeId);
  }

  /**
   * Get the active theme's engine
   */
  getActiveEngine(): LiquidEngine | null {
    const theme = this.getActiveTheme();
    return theme?.engine || null;
  }

  /**
   * Get the active theme's loader
   */
  getActiveLoader(): ThemeLoader | null {
    const theme = this.getActiveTheme();
    return theme?.loader || null;
  }

  /**
   * Unregister a theme
   */
  unregisterTheme(themeId: string): void {
    const theme = this.themes.get(themeId);
    if (theme) {
      theme.engine.clearCache();
      theme.loader.clearCache();
      this.themes.delete(themeId);

      if (this.activeThemeId === themeId) {
        this.activeThemeId = null;
      }
    }
  }

  /**
   * Clear all themes
   */
  clearAll(): void {
    for (const theme of this.themes.values()) {
      theme.engine.clearCache();
      theme.loader.clearCache();
    }
    this.themes.clear();
    this.activeThemeId = null;
  }
}

// Singleton instance
let themeRegistry: ThemeRegistry | null = null;

export function getThemeRegistry(): ThemeRegistry {
  if (!themeRegistry) {
    themeRegistry = new ThemeRegistry();

    // Register the bundled Dawn theme
    themeRegistry.registerTheme('dawn', {
      id: 'dawn',
      name: 'Shopify Dawn',
      version: '15.0.0',
      previewImage: '/themes/dawn/preview.png',
      source: 'bundled',
    });
  }
  return themeRegistry;
}

/**
 * Initialize and load the default theme
 */
export async function initializeDefaultTheme(): Promise<void> {
  const registry = getThemeRegistry();
  await registry.setActiveTheme('dawn');
}
