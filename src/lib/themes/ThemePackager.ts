/**
 * ThemePackager - Server-side utility for reading and packaging theme files
 *
 * This module reads theme files from the public/themes directory for:
 * 1. Serving via API endpoints for client-side preview
 * 2. Packaging for Shopify theme upload
 */

import fs from 'fs/promises';
import path from 'path';

export interface ThemeFile {
  filename: string;  // Relative path, e.g., "sections/header.liquid"
  content: string;
}

interface ThemeManifest {
  config: {
    id: string;
    name: string;
    version: string;
  };
  sections: Array<{
    liquidFile: string;
    cssFile?: string;
  }>;
  layout: {
    theme: string;
    header: string;
    footer: string;
  };
  snippets: string[];
  assets: {
    css: string[];
  };
}

// Directories to upload when creating a theme from Dawn GitHub URL
// We only upload files we need to customize - Dawn's base files are already there
// DO NOT upload: assets, layout, sections, snippets (Dawn's are complete, ours are preview-only)
const SHOPIFY_UPLOAD_DIRECTORIES = [
  'config',     // Our settings_schema.json and settings_data.json
  'templates',  // Our template JSON files
  'locales',    // Our translations
];

// All theme directories (for reference/other uses)
const ALL_THEME_DIRECTORIES = [
  'config',
  'layout',
  'sections',
  'templates',
  'snippets',
  'assets',
  'locales',
];

// Files to exclude from upload
const EXCLUDED_FILES = [
  'manifest.json',      // Our internal manifest, not part of Shopify theme
  'preview.png',        // Theme preview image
  '.DS_Store',
  'Thumbs.db',
];

export class ThemePackager {
  private themesBasePath: string;

  constructor() {
    // Path to public/themes directory
    this.themesBasePath = path.join(process.cwd(), 'public', 'themes');
  }

  /**
   * Get all theme files for a given theme
   * Returns files organized for Shopify upload
   */
  async getThemeFiles(themeId: string): Promise<ThemeFile[]> {
    const themePath = path.join(this.themesBasePath, themeId);
    const files: ThemeFile[] = [];

    // Check if theme exists
    try {
      await fs.access(themePath);
    } catch {
      throw new Error(`Theme '${themeId}' not found at ${themePath}`);
    }

    // Only upload directories we need to customize
    // Dawn's assets, layout, sections, snippets are already there from GitHub
    for (const dir of SHOPIFY_UPLOAD_DIRECTORIES) {
      const dirPath = path.join(themePath, dir);

      try {
        await fs.access(dirPath);
        const dirFiles = await this.readDirectoryRecursively(dirPath, dir);
        files.push(...dirFiles);
      } catch {
        // Directory doesn't exist, skip it
        console.log(`[ThemePackager] Directory ${dir} not found in theme ${themeId}, skipping`);
      }
    }

    console.log(`[ThemePackager] Loaded ${files.length} files from theme '${themeId}'`);
    return files;
  }

  /**
   * Recursively read all files in a directory
   */
  private async readDirectoryRecursively(
    dirPath: string,
    relativePath: string
  ): Promise<ThemeFile[]> {
    const files: ThemeFile[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.join(relativePath, entry.name).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        const subFiles = await this.readDirectoryRecursively(fullPath, relPath);
        files.push(...subFiles);
      } else if (entry.isFile() && !this.shouldExclude(entry.name)) {
        // Read file content
        const content = await fs.readFile(fullPath, 'utf-8');
        files.push({
          filename: relPath,
          content,
        });
      }
    }

    return files;
  }

  /**
   * Check if a file should be excluded from packaging
   */
  private shouldExclude(filename: string): boolean {
    return EXCLUDED_FILES.includes(filename);
  }

  /**
   * Get a specific file from a theme
   */
  async getFile(themeId: string, filePath: string): Promise<string> {
    const fullPath = path.join(this.themesBasePath, themeId, filePath);

    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch {
      throw new Error(`File '${filePath}' not found in theme '${themeId}'`);
    }
  }

  /**
   * List all files in a theme (without content)
   */
  async listFiles(themeId: string): Promise<string[]> {
    const files = await this.getThemeFiles(themeId);
    return files.map(f => f.filename);
  }

  /**
   * Check if a theme exists
   */
  async themeExists(themeId: string): Promise<boolean> {
    const themePath = path.join(this.themesBasePath, themeId);
    try {
      await fs.access(themePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the theme manifest (our internal config, not Shopify's)
   */
  async getManifest(themeId: string): Promise<ThemeManifest> {
    const manifestPath = path.join(this.themesBasePath, themeId, 'manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get list of available themes
   */
  async listThemes(): Promise<string[]> {
    const entries = await fs.readdir(this.themesBasePath, { withFileTypes: true });
    const themes: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Check if it has a manifest.json (valid theme)
        const manifestPath = path.join(this.themesBasePath, entry.name, 'manifest.json');
        try {
          await fs.access(manifestPath);
          themes.push(entry.name);
        } catch {
          // Not a valid theme directory
        }
      }
    }

    return themes;
  }

  /**
   * Get files grouped by type for debugging
   */
  async getFileSummary(themeId: string): Promise<Record<string, number>> {
    const files = await this.getThemeFiles(themeId);
    const summary: Record<string, number> = {};

    for (const file of files) {
      const dir = file.filename.split('/')[0];
      summary[dir] = (summary[dir] || 0) + 1;
    }

    return summary;
  }
}

// Singleton instance for convenience
let packagerInstance: ThemePackager | null = null;

export function getThemePackager(): ThemePackager {
  if (!packagerInstance) {
    packagerInstance = new ThemePackager();
  }
  return packagerInstance;
}
