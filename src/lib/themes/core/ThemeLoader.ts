// Theme file loader with caching

import type { ThemeManifest } from '../types/theme.types';

interface FileCache {
  [key: string]: string;
}

export class ThemeLoader {
  private baseUrl: string;
  private fileCache: FileCache = {};
  private manifestCache: ThemeManifest | null = null;
  private cssCache: string[] = [];

  constructor(themeId: string = 'dawn') {
    this.baseUrl = `/themes/${themeId}`;
  }

  /**
   * Load the theme manifest.json
   */
  async loadManifest(): Promise<ThemeManifest> {
    if (this.manifestCache) {
      return this.manifestCache;
    }

    const response = await fetch(`${this.baseUrl}/manifest.json`);
    if (!response.ok) {
      throw new Error(`Failed to load theme manifest: ${response.statusText}`);
    }

    this.manifestCache = await response.json();
    return this.manifestCache!;
  }

  /**
   * Load a Liquid template file
   */
  async loadTemplate(path: string): Promise<string> {
    const cacheKey = path;

    if (this.fileCache[cacheKey]) {
      return this.fileCache[cacheKey];
    }

    const url = `${this.baseUrl}/${path}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load template ${path}: ${response.statusText}`);
    }

    const content = await response.text();
    this.fileCache[cacheKey] = content;
    return content;
  }

  /**
   * Load a CSS file and return its content
   */
  async loadCSS(path: string): Promise<string> {
    const cacheKey = path;

    if (this.fileCache[cacheKey]) {
      return this.fileCache[cacheKey];
    }

    const url = `${this.baseUrl}/${path}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load CSS ${path}: ${response.statusText}`);
    }

    const content = await response.text();
    this.fileCache[cacheKey] = content;
    return content;
  }

  /**
   * Load all required CSS files for the theme
   */
  async loadAllCSS(): Promise<string> {
    const manifest = await this.loadManifest();

    // Collect all CSS files to load
    const cssFiles = [...manifest.assets.css];

    // Add section-specific CSS files
    for (const section of manifest.sections) {
      if (section.cssFile && !cssFiles.includes(section.cssFile)) {
        cssFiles.push(section.cssFile);
      }
    }

    // Load all CSS files
    const cssContents = await Promise.all(
      cssFiles.map(file => this.loadCSS(file))
    );

    this.cssCache = cssContents;
    return cssContents.join('\n\n');
  }

  /**
   * Get the cached combined CSS
   */
  getCombinedCSS(): string {
    return this.cssCache.join('\n\n');
  }

  /**
   * Preload commonly used templates
   */
  async preloadEssentials(): Promise<void> {
    const manifest = await this.loadManifest();

    // Load layout and essential templates in parallel
    const essentials = [
      manifest.layout.theme,
      manifest.layout.header,
      manifest.layout.footer,
      ...manifest.snippets,
    ];

    await Promise.all(essentials.map(path => this.loadTemplate(path)));
  }

  /**
   * Load a section template by editor type
   */
  async loadSectionByEditorType(editorType: string): Promise<string | null> {
    const manifest = await this.loadManifest();
    const sectionDef = manifest.sections.find(s => s.editorType === editorType);

    if (!sectionDef) {
      console.warn(`No section found for editor type: ${editorType}`);
      return null;
    }

    return this.loadTemplate(sectionDef.liquidFile);
  }

  /**
   * Get section definition by editor type
   */
  async getSectionDefinition(editorType: string) {
    const manifest = await this.loadManifest();
    return manifest.sections.find(s => s.editorType === editorType) || null;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.fileCache = {};
    this.manifestCache = null;
    this.cssCache = [];
  }

  /**
   * Check if a file is cached
   */
  isFileCached(path: string): boolean {
    return path in this.fileCache;
  }
}

// Create a default loader instance
let defaultLoader: ThemeLoader | null = null;

export function getThemeLoader(themeId: string = 'dawn'): ThemeLoader {
  if (!defaultLoader || defaultLoader['baseUrl'] !== `/themes/${themeId}`) {
    defaultLoader = new ThemeLoader(themeId);
  }
  return defaultLoader;
}
