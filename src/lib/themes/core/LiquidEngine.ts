// LiquidJS engine configured for Shopify-compatible rendering

import { Liquid, type TagToken, type Context, type Emitter, type TopLevelToken, type Template } from 'liquidjs';
import { ThemeLoader, getThemeLoader } from './ThemeLoader';
import { templateCache } from './TemplateCache';

export class LiquidEngine {
  private engine: Liquid;
  private loader: ThemeLoader;
  private snippetCache: Map<string, Template[]> = new Map();

  constructor(themeId: string = 'dawn') {
    this.loader = getThemeLoader(themeId);

    this.engine = new Liquid({
      cache: true,
      strictFilters: false,
      strictVariables: false,
      trimTagLeft: false,
      trimTagRight: false,
      trimOutputLeft: false,
      trimOutputRight: false,
      greedy: true,
      lenientIf: true,
    });

    this.registerShopifyFilters();
    this.registerShopifySectionTag();
    this.registerShopifyRenderTag();
    this.registerShopifySchemaTag();
  }

  /**
   * Register Shopify-specific Liquid filters
   */
  private registerShopifyFilters(): void {
    // Money filter - format price
    this.engine.registerFilter('money', (value: number) => {
      if (typeof value !== 'number') return value;
      return `$${(value / 100).toFixed(2)}`;
    });

    this.engine.registerFilter('money_with_currency', (value: number) => {
      if (typeof value !== 'number') return value;
      return `$${(value / 100).toFixed(2)} USD`;
    });

    this.engine.registerFilter('money_without_currency', (value: number) => {
      if (typeof value !== 'number') return value;
      return (value / 100).toFixed(2);
    });

    // Image URL filter
    this.engine.registerFilter('image_url', (value: string, size?: string) => {
      if (!value) return '';
      // For preview, just return the URL as-is
      // In real Shopify, this would transform the URL
      return value;
    });

    this.engine.registerFilter('img_url', (value: string, size?: string) => {
      if (!value) return '';
      return value;
    });

    // Asset URL filter
    this.engine.registerFilter('asset_url', (value: string) => {
      if (!value) return '';
      return `/themes/dawn/assets/${value}`;
    });

    // Stylesheet tag filter
    this.engine.registerFilter('stylesheet_tag', (value: string) => {
      if (!value) return '';
      return `<link rel="stylesheet" href="${value}">`;
    });

    // Script tag filter
    this.engine.registerFilter('script_tag', (value: string) => {
      if (!value) return '';
      return `<script src="${value}"></script>`;
    });

    // Handle filter - convert to URL handle
    this.engine.registerFilter('handle', (value: string) => {
      if (!value) return '';
      return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    });

    this.engine.registerFilter('handleize', (value: string) => {
      if (!value) return '';
      return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    });

    // Escape filter
    this.engine.registerFilter('escape', (value: string) => {
      if (!value) return '';
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    });

    // Strip HTML filter
    this.engine.registerFilter('strip_html', (value: string) => {
      if (!value) return '';
      return value.replace(/<[^>]*>/g, '');
    });

    // Newline to BR filter
    this.engine.registerFilter('newline_to_br', (value: string) => {
      if (!value) return '';
      return value.replace(/\n/g, '<br>');
    });

    // Pluralize filter
    this.engine.registerFilter('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });

    // T (translate) filter - just returns the key for preview
    this.engine.registerFilter('t', (value: string) => {
      return value;
    });

    // JSON filter
    this.engine.registerFilter('json', (value: unknown) => {
      return JSON.stringify(value);
    });

    // Default filter
    this.engine.registerFilter('default', (value: unknown, defaultValue: unknown) => {
      if (value === null || value === undefined || value === '' || value === false) {
        return defaultValue;
      }
      return value;
    });

    // Product URL filter
    this.engine.registerFilter('product_url', (product: { handle?: string }) => {
      if (!product?.handle) return '/products/';
      return `/products/${product.handle}`;
    });

    // Collection URL filter
    this.engine.registerFilter('collection_url', (collection: { handle?: string }) => {
      if (!collection?.handle) return '/collections/';
      return `/collections/${collection.handle}`;
    });

    // Within filter (for collection links)
    this.engine.registerFilter('within', (url: string, collection: { url?: string }) => {
      if (!collection?.url) return url;
      return `${collection.url}${url}`;
    });

    // Link to filter
    this.engine.registerFilter('link_to', (text: string, url: string, title?: string) => {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${url}"${titleAttr}>${text}</a>`;
    });

    // Image tag filter
    this.engine.registerFilter('img_tag', (url: string, alt?: string) => {
      const altAttr = alt ? ` alt="${alt}"` : '';
      return `<img src="${url}"${altAttr}>`;
    });

    // Placeholder SVG filter
    this.engine.registerFilter('placeholder_svg_tag', (type: string) => {
      return `<svg class="placeholder-svg" viewBox="0 0 100 100"><rect fill="#ddd" width="100" height="100"/></svg>`;
    });

    // Color filters
    this.engine.registerFilter('color_to_rgb', (value: string) => {
      return value; // Simplified - just return as-is
    });

    this.engine.registerFilter('color_to_hex', (value: string) => {
      return value; // Simplified - just return as-is
    });

    this.engine.registerFilter('color_brightness', (value: string) => {
      return 128; // Return middle brightness as default
    });

    // URL filters
    this.engine.registerFilter('url_encode', (value: string) => {
      return encodeURIComponent(value || '');
    });

    this.engine.registerFilter('url_decode', (value: string) => {
      return decodeURIComponent(value || '');
    });

    // Time filters
    this.engine.registerFilter('time_tag', (date: Date | string, format?: string) => {
      const d = new Date(date);
      return `<time datetime="${d.toISOString()}">${d.toLocaleDateString()}</time>`;
    });
  }

  /**
   * Register the {% section %} tag for including sections
   */
  private registerShopifySectionTag(): void {
    const self = this;

    this.engine.registerTag('section', {
      parse(tagToken: TagToken) {
        // Extract section name from tag, e.g., {% section 'header' %}
        this.sectionName = tagToken.args.replace(/['"]/g, '').trim();
      },
      async render(ctx: Context, emitter: Emitter) {
        const sectionName = this.sectionName;
        if (!sectionName) return '';

        try {
          // Load the section template
          const templateContent = await self.loader.loadTemplate(`sections/${sectionName}.liquid`);

          // Strip the schema tag from the template before rendering
          const cleanTemplate = self.stripSchemaTag(templateContent);

          // Parse and render the section
          const templates = self.engine.parse(cleanTemplate);
          const result = await self.engine.render(templates, ctx.getAll());
          emitter.write(result);
        } catch (error) {
          console.warn(`Failed to render section ${sectionName}:`, error);
          emitter.write(`<!-- Section ${sectionName} failed to load -->`);
        }
      },
    });
  }

  /**
   * Register the {% render %} tag for including snippets
   */
  private registerShopifyRenderTag(): void {
    const self = this;

    this.engine.registerTag('render', {
      parse(tagToken: TagToken) {
        // Parse: {% render 'snippet-name', var1: value1, var2: value2 %}
        const args = tagToken.args;
        const parts = args.split(',').map((p: string) => p.trim());

        this.snippetName = parts[0].replace(/['"]/g, '').trim();
        this.variables = {};

        // Parse variable assignments
        for (let i = 1; i < parts.length; i++) {
          const match = parts[i].match(/(\w+):\s*(.+)/);
          if (match) {
            this.variables[match[1]] = match[2].trim();
          }
        }
      },
      async render(ctx: Context, emitter: Emitter) {
        const snippetName = this.snippetName;
        const variables = this.variables;

        if (!snippetName) return '';

        try {
          // Load the snippet template
          const templateContent = await self.loader.loadTemplate(`snippets/${snippetName}.liquid`);

          // Build local scope with passed variables
          const localScope: Record<string, unknown> = {};
          for (const [key, valueExpr] of Object.entries(variables)) {
            // Evaluate the expression in the current context
            const value = ctx.get([valueExpr as string]);
            localScope[key] = value !== undefined ? value : (valueExpr as string);
          }

          // Create a new context with local scope
          const fullContext = { ...ctx.getAll(), ...localScope };

          // Parse and render
          const templates = self.engine.parse(templateContent);
          const result = await self.engine.render(templates, fullContext);
          emitter.write(result);
        } catch (error) {
          console.warn(`Failed to render snippet ${snippetName}:`, error);
          emitter.write(`<!-- Snippet ${snippetName} failed to load -->`);
        }
      },
    });
  }

  /**
   * Register the {% schema %} tag (ignored in preview - just for definitions)
   */
  private registerShopifySchemaTag(): void {
    this.engine.registerTag('schema', {
      parse(tagToken: TagToken, remainTokens: TopLevelToken[]) {
        // Consume all tokens until endschema
        this.tokens = [];
        let token: TopLevelToken | undefined;
        while ((token = remainTokens.shift())) {
          if (token.kind === 8 && (token as unknown as TagToken).name === 'endschema') {
            break;
          }
          this.tokens.push(token);
        }
      },
      render() {
        // Schema tags don't render anything
        return '';
      },
    });
  }

  /**
   * Strip {% schema %} blocks from template content
   */
  private stripSchemaTag(content: string): string {
    return content.replace(/\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/g, '');
  }

  /**
   * Parse a template string and cache it
   */
  parseTemplate(content: string, cacheKey?: string): Template[] {
    if (cacheKey) {
      const cached = templateCache.get(cacheKey);
      if (cached) return cached;
    }

    const templates = this.engine.parse(content);

    if (cacheKey) {
      templateCache.set(cacheKey, templates);
    }

    return templates;
  }

  /**
   * Render a parsed template with context
   */
  async renderTemplate(templates: Template[], context: Record<string, unknown>): Promise<string> {
    return this.engine.render(templates, context);
  }

  /**
   * Parse and render a template string
   */
  async render(content: string, context: Record<string, unknown>, cacheKey?: string): Promise<string> {
    const cleanContent = this.stripSchemaTag(content);
    const templates = this.parseTemplate(cleanContent, cacheKey);
    return this.renderTemplate(templates, context);
  }

  /**
   * Render a section by type
   */
  async renderSection(
    sectionType: string,
    context: Record<string, unknown>
  ): Promise<string> {
    const templateContent = await this.loader.loadTemplate(`sections/${sectionType}.liquid`);
    return this.render(templateContent, context, `section:${sectionType}`);
  }

  /**
   * Render the full page with layout
   */
  async renderPage(
    contentForLayout: string,
    context: Record<string, unknown>
  ): Promise<string> {
    const layoutTemplate = await this.loader.loadTemplate('layout/theme.liquid');
    const fullContext = {
      ...context,
      content_for_layout: contentForLayout,
      content_for_header: '', // Empty for preview
    };

    return this.render(layoutTemplate, fullContext, 'layout:theme');
  }

  /**
   * Get the underlying Liquid engine
   */
  getEngine(): Liquid {
    return this.engine;
  }

  /**
   * Get the theme loader
   */
  getLoader(): ThemeLoader {
    return this.loader;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    templateCache.clear();
    this.snippetCache.clear();
    this.loader.clearCache();
  }
}

// Create singleton instance
let liquidEngine: LiquidEngine | null = null;

export function getLiquidEngine(themeId: string = 'dawn'): LiquidEngine {
  if (!liquidEngine) {
    liquidEngine = new LiquidEngine(themeId);
  }
  return liquidEngine;
}
