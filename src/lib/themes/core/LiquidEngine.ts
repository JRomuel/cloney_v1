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
    this.registerShopifySectionsTag();
    this.registerShopifyRenderTag();
    this.registerShopifySchemaTag();
    this.registerShopifyStyleTag();
    this.registerShopifyJavascriptTag();
    this.registerShopifyFormTag();
    this.registerShopifyCommentTag();
  }

  /**
   * Register the {% form %} tag for Shopify forms
   * Note: Form tags are converted to divs in preprocessing, this is a fallback
   */
  private registerShopifyFormTag(): void {
    // Form tags are handled in preprocessing, but register as no-op fallback
    this.engine.registerTag('form', {
      parse() {},
      render() { return ''; },
    });
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

    // Image URL filter - handles both string URLs and Shopify image objects
    this.engine.registerFilter('image_url', (value: unknown, ...args: unknown[]) => {
      if (!value) return '';
      // Handle Shopify image objects
      if (typeof value === 'object' && value !== null) {
        const img = value as { src?: string; url?: string };
        return img.src || img.url || '';
      }
      // Already a URL string
      return String(value);
    });

    this.engine.registerFilter('img_url', (value: unknown, size?: string) => {
      if (!value) return '';
      // Handle Shopify image objects
      if (typeof value === 'object' && value !== null) {
        const img = value as { src?: string; url?: string };
        return img.src || img.url || '';
      }
      return String(value);
    });

    // Asset URL filter
    this.engine.registerFilter('asset_url', (value: string) => {
      if (!value) return '';
      return `/themes/dawn/assets/${value}`;
    });

    // Inline asset content filter - returns inline SVG content for icons
    // These SVGs use currentColor to inherit text color from CSS
    this.engine.registerFilter('inline_asset_content', (value: string) => {
      if (!value) return '';

      // Common Shopify Dawn icons - inline SVG with currentColor for CSS inheritance
      const inlineSvgs: Record<string, string> = {
        'icon-hamburger.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-hamburger" fill="none" viewBox="0 0 18 16"><path fill="currentColor" d="M1 .5a.5.5 0 100 1h15.71a.5.5 0 000-1H1zM.5 8a.5.5 0 01.5-.5h15.71a.5.5 0 010 1H1A.5.5 0 01.5 8zm0 7a.5.5 0 01.5-.5h15.71a.5.5 0 010 1H1a.5.5 0 01-.5-.5z"/></svg>',
        'icon-close.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-close" fill="none" viewBox="0 0 18 17"><path fill="currentColor" d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z"/></svg>',
        'icon-search.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-search" fill="none" viewBox="0 0 18 19"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.03 11.68A5.784 5.784 0 112.85 3.5a5.784 5.784 0 018.18 8.18zm.26 1.12a6.78 6.78 0 11.72-.7l5.4 5.4a.5.5 0 11-.7.7l-5.42-5.4z" fill="currentColor"/></svg>',
        'icon-cart.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-cart" fill="none" viewBox="0 0 40 40"><path fill="currentColor" fill-rule="evenodd" d="M20.5 6.5a4.75 4.75 0 00-4.75 4.75v.56h-3.16l-.77 11.6a5 5 0 004.99 5.34h7.38a5 5 0 004.99-5.33l-.77-11.6h-3.16v-.57A4.75 4.75 0 0020.5 6.5zm3.75 5.31v-.56a3.75 3.75 0 10-7.5 0v.56h7.5zm-7.5 1h7.5v.56a3.75 3.75 0 11-7.5 0v-.56zm-1 0v.56a4.75 4.75 0 109.5 0v-.56h2.22l.71 10.67a4 4 0 01-3.99 4.27h-7.38a4 4 0 01-4-4.27l.72-10.67h2.22z"/></svg>',
        'icon-cart-empty.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-cart-empty" fill="none" viewBox="0 0 40 40"><path fill="currentColor" fill-rule="evenodd" d="M20.5 6.5a4.75 4.75 0 00-4.75 4.75v.56h-3.16l-.77 11.6a5 5 0 004.99 5.34h7.38a5 5 0 004.99-5.33l-.77-11.6h-3.16v-.57A4.75 4.75 0 0020.5 6.5zm3.75 5.31v-.56a3.75 3.75 0 10-7.5 0v.56h7.5zm-7.5 1h7.5v.56a3.75 3.75 0 11-7.5 0v-.56zm-1 0v.56a4.75 4.75 0 109.5 0v-.56h2.22l.71 10.67a4 4 0 01-3.99 4.27h-7.38a4 4 0 01-4-4.27l.72-10.67h2.22z"/></svg>',
        'icon-caret.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-caret" viewBox="0 0 10 6"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.354.646a.5.5 0 00-.708 0L5 4.293 1.354.646a.5.5 0 00-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 000-.708z" fill="currentColor"/></svg>',
        'icon-arrow.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-arrow" fill="none" viewBox="0 0 14 10"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.537.808a.5.5 0 01.817-.162l4 4a.5.5 0 010 .708l-4 4a.5.5 0 11-.708-.708L11.293 5.5H1a.5.5 0 010-1h10.293L8.646 1.854a.5.5 0 01-.109-.542z" fill="currentColor"/></svg>',
        'icon-account.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-account" fill="none" viewBox="0 0 18 19"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 4.5a3 3 0 116 0 3 3 0 01-6 0zm3-4a4 4 0 100 8 4 4 0 000-8zm5.58 12.15c1.12.82 1.83 2.24 1.91 4.85H1.51c.08-2.6.79-4.03 1.9-4.85C4.66 11.75 6.5 11.5 9 11.5s4.35.26 5.58 1.15zM9 10.5c-2.5 0-4.65.24-6.17 1.35C1.27 12.98.5 14.93.5 18v.5h17V18c0-3.07-.77-5.02-2.33-6.15-1.52-1.1-3.67-1.35-6.17-1.35z" fill="currentColor"/></svg>',
        'icon-checkmark.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-checkmark" fill="none" viewBox="0 0 12 9"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.35.643a.5.5 0 01.006.707l-6.77 6.886a.5.5 0 01-.719-.006L.638 4.845a.5.5 0 11.724-.69l2.872 3.011 6.41-6.517a.5.5 0 01.707-.006z" fill="currentColor"/></svg>',
        'icon-reset.svg': '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-reset" fill="none" viewBox="0 0 16 16"><path d="M8 0a8 8 0 108 8 .5.5 0 00-1 0A7 7 0 118 1a6.973 6.973 0 014.393 1.55l-1.54.257a.5.5 0 00.164.986l2.828-.471a.5.5 0 00.411-.578l-.471-2.828a.5.5 0 00-.986.164l.237 1.418A7.97 7.97 0 008 0z" fill="currentColor"/></svg>',
        'loading-spinner.svg': '<svg aria-hidden="true" focusable="false" class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="path" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle></svg>',
      };

      // Return the inline SVG if we have it
      if (inlineSvgs[value]) {
        return inlineSvgs[value];
      }

      // Fallback: return an img tag for unknown SVGs
      const assetPath = `/themes/dawn/assets/${value}`;
      if (value.endsWith('.svg')) {
        return `<img src="${assetPath}" alt="${value.replace('.svg', '')}" class="icon" style="display:inline-block;width:1.5rem;height:1.5rem;">`;
      }
      return '';
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

    // Image tag filter - handles Shopify's complex named parameters
    this.engine.registerFilter('img_tag', (url: unknown, alt?: string) => {
      const urlStr = typeof url === 'string' ? url : (url as { src?: string })?.src || '';
      if (!urlStr) return '';
      const altAttr = alt ? ` alt="${alt}"` : '';
      return `<img src="${urlStr}"${altAttr}>`;
    });

    // image_tag filter - Shopify's more complex version with named params
    // Usage: {{ image | image_url: width: 300 | image_tag: class: 'my-class', alt: 'My alt' }}
    this.engine.registerFilter('image_tag', (url: unknown, ...args: unknown[]) => {
      // Get the URL from string or object
      let urlStr = '';
      if (typeof url === 'string') {
        urlStr = url;
      } else if (url && typeof url === 'object') {
        const img = url as { src?: string; url?: string };
        urlStr = img.src || img.url || '';
      }

      if (!urlStr) return '';

      // Parse named arguments - LiquidJS passes them as key-value pairs
      const attrs: string[] = [];
      for (let i = 0; i < args.length; i += 2) {
        const key = String(args[i]).replace(':', '');
        const value = args[i + 1];
        if (key && value !== undefined && value !== null) {
          attrs.push(`${key}="${value}"`);
        }
      }

      const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
      return `<img src="${urlStr}"${attrStr}>`;
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

    this.engine.registerFilter('color_lighten', (value: string, amount: number) => {
      return value; // Simplified - just return as-is
    });

    this.engine.registerFilter('color_darken', (value: string, amount: number) => {
      return value; // Simplified - just return as-is
    });

    // Font filters
    this.engine.registerFilter('font_face', (font: unknown, options?: string) => {
      // Return empty for preview - fonts handled by CSS
      return '';
    });

    this.engine.registerFilter('font_modify', (font: unknown, property: string, value: string) => {
      // Return the font object for chaining
      return font || {};
    });

    this.engine.registerFilter('font_url', (font: unknown) => {
      // Return empty for preview
      return '';
    });

    // Math filters
    this.engine.registerFilter('divided_by', (value: number, divisor: number) => {
      if (typeof value !== 'number' || typeof divisor !== 'number' || divisor === 0) return value;
      return value / divisor;
    });

    this.engine.registerFilter('abs', (value: number) => {
      if (typeof value !== 'number') return value;
      return Math.abs(value);
    });

    this.engine.registerFilter('plus', (value: number, addend: number) => {
      if (typeof value !== 'number' || typeof addend !== 'number') return value;
      return value + addend;
    });

    this.engine.registerFilter('minus', (value: number, subtrahend: number) => {
      if (typeof value !== 'number' || typeof subtrahend !== 'number') return value;
      return value - subtrahend;
    });

    this.engine.registerFilter('times', (value: number, multiplier: number) => {
      if (typeof value !== 'number' || typeof multiplier !== 'number') return value;
      return value * multiplier;
    });

    this.engine.registerFilter('modulo', (value: number, divisor: number) => {
      if (typeof value !== 'number' || typeof divisor !== 'number') return value;
      return value % divisor;
    });

    this.engine.registerFilter('round', (value: number, precision?: number) => {
      if (typeof value !== 'number') return value;
      if (precision === undefined || precision === 0) {
        return Math.round(value);
      }
      const factor = Math.pow(10, precision);
      return Math.round(value * factor) / factor;
    });

    this.engine.registerFilter('floor', (value: number) => {
      if (typeof value !== 'number') return value;
      return Math.floor(value);
    });

    this.engine.registerFilter('ceil', (value: number) => {
      if (typeof value !== 'number') return value;
      return Math.ceil(value);
    });

    this.engine.registerFilter('at_most', (value: number, max: number) => {
      if (typeof value !== 'number' || typeof max !== 'number') return value;
      return Math.min(value, max);
    });

    this.engine.registerFilter('at_least', (value: number, min: number) => {
      if (typeof value !== 'number' || typeof min !== 'number') return value;
      return Math.max(value, min);
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

    // Date filter - Shopify-compatible (handles 'now' string and strftime format)
    this.engine.registerFilter('date', (value: Date | string | number, format?: string) => {
      // Handle 'now' string like Shopify does
      const d = value === 'now' ? new Date() : new Date(value);
      if (isNaN(d.getTime())) return value;

      if (!format) return d.toLocaleDateString();

      // Convert strftime format to date parts
      return format
        .replace('%Y', String(d.getFullYear()))
        .replace('%y', String(d.getFullYear()).slice(-2))
        .replace('%m', String(d.getMonth() + 1).padStart(2, '0'))
        .replace('%d', String(d.getDate()).padStart(2, '0'))
        .replace('%B', d.toLocaleDateString('en-US', { month: 'long' }))
        .replace('%b', d.toLocaleDateString('en-US', { month: 'short' }));
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

          // Get section context from sections object if available
          const sections = ctx.get(['sections']) as Record<string, unknown> | undefined;
          const sectionContext = sections?.[sectionName];

          // Build context with section data
          const renderContext = {
            ...ctx.getAll(),
            section: sectionContext || {
              id: sectionName,
              type: sectionName,
              settings: {},
              blocks: [],
              block_order: [],
            },
          };

          // Parse and render the section with proper context
          const templates = self.engine.parse(cleanTemplate);
          const result = await self.engine.render(templates, renderContext);
          emitter.write(result);
        } catch (error) {
          console.warn(`Failed to render section ${sectionName}:`, error);
          emitter.write(`<!-- Section ${sectionName} failed to load -->`);
        }
      },
    });
  }

  /**
   * Register the {% sections %} tag for section groups
   */
  private registerShopifySectionsTag(): void {
    const self = this;

    this.engine.registerTag('sections', {
      parse(tagToken: TagToken) {
        // Extract section group name from tag, e.g., {% sections 'header-group' %}
        this.groupName = tagToken.args.replace(/['"]/g, '').trim();
      },
      async render(ctx: Context, emitter: Emitter) {
        const groupName = this.groupName;
        if (!groupName) return '';

        try {
          // Get section group content from context or render placeholder
          const sectionGroups = ctx.get(['section_groups']) as Record<string, string> | undefined;
          if (sectionGroups?.[groupName]) {
            emitter.write(sectionGroups[groupName]);
            return;
          }

          // For header-group, render announcement-bar first, then header
          if (groupName === 'header-group') {
            let result = '';
            const sections = ctx.get(['sections']) as Record<string, unknown> | undefined;

            // Render announcement bar first
            try {
              const announcementContext = sections?.['announcement-bar'];
              if (announcementContext) {
                const announcementTemplate = await self.loader.loadTemplate('sections/announcement-bar.liquid');
                const cleanAnnouncement = self.stripSchemaTag(announcementTemplate);
                const announcementRenderCtx = { ...ctx.getAll(), section: announcementContext };
                result += await self.engine.render(self.engine.parse(cleanAnnouncement), announcementRenderCtx);
              }
            } catch (announcementError) {
              console.warn('[LiquidEngine] Announcement bar render error:', announcementError);
              result += `<!-- Announcement bar render error: ${announcementError} -->`;
            }

            // Then render header
            try {
              const templateContent = await self.loader.loadTemplate('sections/header.liquid');
              const cleanTemplate = self.stripSchemaTag(templateContent);
              const sectionContext = sections?.['header'];
              const renderContext = {
                ...ctx.getAll(),
                section: sectionContext || { id: 'header', type: 'header', settings: {}, blocks: [], block_order: [] },
              };
              const parsed = self.engine.parse(cleanTemplate);
              result += await self.engine.render(parsed, renderContext);
            } catch (renderError) {
              console.error('[LiquidEngine] Header render error:', renderError);
              result += `<!-- Header render error: ${renderError} -->`;
            }

            emitter.write(result);
            return;
          }

          // For footer-group, render the footer section
          if (groupName === 'footer-group') {
            const templateContent = await self.loader.loadTemplate('sections/footer.liquid');
            const cleanTemplate = self.stripSchemaTag(templateContent);
            const sections = ctx.get(['sections']) as Record<string, unknown> | undefined;
            const sectionContext = sections?.['footer'];
            const renderContext = {
              ...ctx.getAll(),
              section: sectionContext || { id: 'footer', type: 'footer', settings: {}, blocks: [], block_order: [] },
            };
            const result = await self.engine.render(self.engine.parse(cleanTemplate), renderContext);
            emitter.write(result);
            return;
          }

          // Default: output a placeholder comment
          emitter.write(`<!-- Section group ${groupName} -->`);
        } catch (error) {
          console.warn(`Failed to render section group ${groupName}:`, error);
          emitter.write(`<!-- Section group ${groupName} failed to load -->`);
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

          // Preprocess the template
          const cleanTemplate = self.stripSchemaTag(templateContent);

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
          const templates = self.engine.parse(cleanTemplate);
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
   * Register the {% style %} tag for inline CSS output
   * Note: Style blocks are converted to <style> tags during preprocessing
   * This is a no-op fallback in case any slip through
   */
  private registerShopifyStyleTag(): void {
    this.engine.registerTag('style', {
      parse(tagToken: TagToken, remainTokens: TopLevelToken[]) {
        // Consume all tokens until endstyle
        let token: TopLevelToken | undefined;
        while ((token = remainTokens.shift())) {
          const tagName = (token as unknown as { name?: string }).name;
          if (tagName === 'endstyle') {
            break;
          }
        }
      },
      render() {
        // Style blocks are handled in preprocessing, output nothing
        return '';
      },
    });
  }

  /**
   * Register the {% javascript %} tag for inline script output
   * Note: Javascript blocks are converted to <script> tags during preprocessing
   * This is a no-op fallback in case any slip through
   */
  private registerShopifyJavascriptTag(): void {
    this.engine.registerTag('javascript', {
      parse(tagToken: TagToken, remainTokens: TopLevelToken[]) {
        // Consume all tokens until endjavascript
        let token: TopLevelToken | undefined;
        while ((token = remainTokens.shift())) {
          const tagName = (token as unknown as { name?: string }).name;
          if (tagName === 'endjavascript') {
            break;
          }
        }
      },
      render() {
        // Javascript blocks are handled in preprocessing, output nothing
        return '';
      },
    });
  }

  /**
   * Register the {% comment %} tag for comments
   * LiquidJS has this built-in but we override for consistency
   */
  private registerShopifyCommentTag(): void {
    this.engine.registerTag('comment', {
      parse(tagToken: TagToken, remainTokens: TopLevelToken[]) {
        // Consume all tokens until endcomment
        let token: TopLevelToken | undefined;
        while ((token = remainTokens.shift())) {
          const tagName = (token as unknown as { name?: string }).name;
          if (tagName === 'endcomment') {
            break;
          }
        }
      },
      render() {
        // Comments output nothing
        return '';
      },
    });
  }

  /**
   * Strip schema blocks and convert liquid tags
   */
  private preprocessTemplate(content: string): string {
    // Strip schema blocks
    let result = content.replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, '');

    // Convert {% style %} blocks to <style> tags (the content inside is still Liquid and will be rendered)
    result = result.replace(/\{%-?\s*style\s*-?%\}([\s\S]*?)\{%-?\s*endstyle\s*-?%\}/g, '<style>$1</style>');

    // Convert {% javascript %} blocks to <script> tags
    result = result.replace(/\{%-?\s*javascript\s*-?%\}([\s\S]*?)\{%-?\s*endjavascript\s*-?%\}/g, '<script>$1</script>');

    // Convert form tags to simple div wrappers (forms aren't functional in preview)
    result = result.replace(/\{%-?\s*form\s+[^%]*-?%\}/g, '<div class="form-placeholder">');
    result = result.replace(/\{%-?\s*endform\s*-?%\}/g, '</div>');

    // Convert {% liquid %} tags to regular Liquid syntax
    // The liquid tag allows multiple statements without {% %} delimiters
    // Format: {% liquid statement1 \n statement2 \n ... %}
    result = result.replace(/\{%-?\s*liquid\b([\s\S]*?)-?%\}/g, (match, innerContent) => {
      // Split by newlines and convert each line to a Liquid tag
      const lines = innerContent.split('\n');
      return lines
        .map((line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          // Skip comment lines
          if (trimmed.startsWith('#')) return '';
          // Wrap each statement in {% %}
          return `{% ${trimmed} %}`;
        })
        .filter((line: string) => line)
        .join('\n');
    });

    return result;
  }

  /**
   * Strip {% schema %} blocks from template content (legacy method name for compatibility)
   */
  private stripSchemaTag(content: string): string {
    return this.preprocessTemplate(content);
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
