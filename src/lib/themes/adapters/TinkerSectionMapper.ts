// Tinker Theme Section Mapper
// Maps editor content to Tinker's native section types with nested block structures

import type { ThemeSectionMapper, MappedSection } from './ThemeSectionMapper';
import type { LiquidSection, SectionBlock } from '../types/theme.types';
import type {
  HeroContent,
  EditableProduct,
  Section,
  FeaturesContent,
  TestimonialsContent,
  GalleryContent,
  TextContent,
} from '@/types/editor';
import { createMockCollection } from '../core/MockDataProvider';

/**
 * Generate a unique block ID
 */
function generateBlockId(prefix: string = 'block'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a blocks object with a `size` property for Liquid template compatibility.
 * Shopify Liquid uses `.size` property on objects/arrays, but JavaScript objects don't have this.
 * This wrapper adds the size property so templates like `{% if section.blocks.size == 0 %}` work.
 */
function createBlocksWithSize(blocks: Record<string, SectionBlock>): Record<string, SectionBlock> & { size: number } {
  const blocksWithSize = { ...blocks } as Record<string, SectionBlock> & { size: number };
  Object.defineProperty(blocksWithSize, 'size', {
    value: Object.keys(blocks).length,
    enumerable: false,  // Don't show up in Object.keys() or for...in loops
    writable: false,
  });
  return blocksWithSize;
}

/**
 * Create a blocks array with a `size` property for Liquid template compatibility.
 * JavaScript arrays have `.length`, but Shopify Liquid uses `.size`.
 */
function createBlocksArrayWithSize(blocks: SectionBlock[]): SectionBlock[] & { size: number } {
  const blocksWithSize = [...blocks] as SectionBlock[] & { size: number };
  Object.defineProperty(blocksWithSize, 'size', {
    value: blocks.length,
    enumerable: false,
    writable: false,
  });
  return blocksWithSize;
}

/**
 * Section mapper for Tinker theme
 * Uses Tinker's native sections with nested group/text block structures
 */
export class TinkerSectionMapper implements ThemeSectionMapper {
  readonly themeId = 'tinker';

  private readonly sectionTypes = {
    hero: 'hero',
    featuredCollection: 'product-list',
    richText: 'rich-text',
    mainProduct: 'product-information',
  };

  /**
   * Map hero content to Tinker's hero section with nested blocks
   *
   * Tinker's hero uses a nested structure:
   * - Section with content_for 'blocks'
   * - group blocks containing text blocks
   */
  mapHero(hero: HeroContent): MappedSection {
    const blocks: Record<string, SectionBlock> = {};
    const blockOrder: string[] = [];

    // Create title text block
    const titleBlockId = generateBlockId('text_title');
    blocks[titleBlockId] = {
      id: titleBlockId,
      type: 'text',
      settings: {
        text: `<h1>${hero.title}</h1>`,
        type_preset: 'h1',
        width: '100%',
        max_width: 'normal',
        alignment: 'center',
        font: 'var(--font-primary--family)',
        font_size: '',
        line_height: 'normal',
        letter_spacing: 'normal',
        case: 'none',
        wrap: 'pretty',
        color: '',
        background: false,
        background_color: '#00000026',
        corner_radius: 0,
        'padding-block-start': 0,
        'padding-block-end': 0,
        'padding-inline-start': 0,
        'padding-inline-end': 0,
      },
    };
    blockOrder.push(titleBlockId);

    // Create subtitle text block if subtitle exists
    if (hero.subtitle) {
      const subtitleBlockId = generateBlockId('text_subtitle');
      blocks[subtitleBlockId] = {
        id: subtitleBlockId,
        type: 'text',
        settings: {
          text: `<p>${hero.subtitle}</p>`,
          type_preset: 'rte',
          width: '100%',
          max_width: 'narrow',
          alignment: 'center',
          font: 'var(--font-body--family)',
          font_size: '',
          line_height: 'normal',
          letter_spacing: 'normal',
          case: 'none',
          wrap: 'pretty',
          color: '',
          background: false,
          background_color: '#00000026',
          corner_radius: 0,
          'padding-block-start': 0,
          'padding-block-end': 32,
          'padding-inline-start': 0,
          'padding-inline-end': 0,
        },
      };
      blockOrder.push(subtitleBlockId);
    }

    // Create CTA button block if CTA exists
    if (hero.ctaText) {
      const buttonBlockId = generateBlockId('button');
      blocks[buttonBlockId] = {
        id: buttonBlockId,
        type: 'button',
        settings: {
          label: hero.ctaText,
          link: hero.ctaUrl || '/collections/all',
          open_in_new_tab: false,
          style_class: 'button--primary',
          width: 'fit-content',
          custom_width: 100,
          width_mobile: 'fit-content',
          custom_width_mobile: 100,
        },
      };
      blockOrder.push(buttonBlockId);
    }

    const section: LiquidSection = {
      id: 'hero',
      type: 'hero',
      settings: {
        // Media settings
        media_type_1: 'image',
        image_1: hero.backgroundImage || null,
        media_type_2: 'image',
        image_2: null,
        // Mobile settings
        stack_media_on_mobile: false,
        custom_mobile_media: false,
        // Layout settings
        content_direction: 'column',
        vertical_on_mobile: true,
        horizontal_alignment: 'flex-start',
        vertical_alignment: 'center',
        align_baseline: false,
        horizontal_alignment_flex_direction_column: 'center',
        vertical_alignment_flex_direction_column: 'center',
        gap: 16,
        section_width: 'page-width',
        section_height: 'large',
        // Appearance
        color_scheme: 'scheme-1',
        toggle_overlay: true,
        overlay_color: '#00000040',
        overlay_style: 'gradient',
        gradient_direction: 'to top',
        blurred_reflection: false,
        reflection_opacity: 75,
        // Padding
        'padding-block-start': 40,
        'padding-block-end': 40,
        // Border
        border: 'none',
        border_width: 0,
        border_opacity: 100,
      },
      blocks: createBlocksWithSize(blocks),  // Keep as object with .size property for Tinker template compatibility
      block_order: blockOrder,
    };

    return {
      section,
      sectionType: 'hero',
    };
  }

  /**
   * Map products to Tinker's product-list section
   *
   * Tinker's product-list uses static blocks:
   * - _product-list-content for header
   * - _product-card for product card template
   */
  mapProducts(products: EditableProduct[], title: string = 'Featured Products'): MappedSection {
    const collection = createMockCollection(title, products);

    // Create static header block
    const headerBlock: SectionBlock = {
      id: 'static-header',
      type: '_product-list-content',
      name: 'Header',
      static: true,
      settings: {
        content_direction: 'row',
        vertical_on_mobile: false,
        horizontal_alignment: 'space-between',
        vertical_alignment: 'flex-end',
        align_baseline: true,
        horizontal_alignment_flex_direction_column: 'flex-start',
        vertical_alignment_flex_direction_column: 'center',
        gap: 12,
        width: 'fill',
        custom_width: 100,
        width_mobile: 'fill',
        custom_width_mobile: 100,
        height: 'fit',
        custom_height: 100,
        inherit_color_scheme: true,
        color_scheme: '',
        background_media: 'none',
        border: 'none',
        border_width: 1,
        border_opacity: 100,
        border_radius: 0,
        'padding-block-start': 0,
        'padding-block-end': 0,
        'padding-inline-start': 0,
        'padding-inline-end': 0,
      },
      blocks: {
        'product_list_text': {
          id: 'product_list_text',
          type: '_product-list-text',
          name: 'Collection title',
          settings: {
            text: `<h3>${title}</h3>`,
            type_preset: 'rte',
            font: 'var(--font-body--family)',
            font_size: '',
            line_height: 'normal',
            letter_spacing: 'normal',
            case: 'none',
            wrap: 'pretty',
            width: 'fit-content',
            max_width: 'normal',
            alignment: 'left',
            'padding-block-start': 0,
            'padding-block-end': 0,
            'padding-inline-start': 0,
            'padding-inline-end': 0,
          },
        },
        'product_list_button': {
          id: 'product_list_button',
          type: '_product-list-button',
          name: 'View all button',
          settings: {
            label: 'View all',
            open_in_new_tab: false,
            style_class: 'link',
            width: 'fit-content',
            custom_width: 100,
            width_mobile: 'fit-content',
            custom_width_mobile: 100,
          },
        },
      },
      block_order: ['product_list_text', 'product_list_button'],
    };

    // Create static product card block
    const productCardBlock: SectionBlock = {
      id: 'static-product-card',
      type: '_product-card',
      name: 'Product card',
      static: true,
      settings: {
        product_card_gap: 4,
        inherit_color_scheme: true,
        color_scheme: '',
        border: 'none',
        border_width: 1,
        border_opacity: 100,
        border_radius: 0,
        'padding-block-start': 0,
        'padding-block-end': 0,
        'padding-inline-start': 0,
        'padding-inline-end': 0,
      },
      blocks: {
        'product-card-gallery': {
          id: 'product-card-gallery',
          type: '_product-card-gallery',
          name: 'Product media',
          settings: {
            image_ratio: 'adapt',
            border: 'none',
            border_width: 1,
            border_opacity: 100,
            border_radius: 0,
            'padding-block-start': 0,
            'padding-block-end': 0,
            'padding-inline-start': 0,
            'padding-inline-end': 0,
          },
        },
        'product_title': {
          id: 'product_title',
          type: 'product-title',
          name: 'Product title',
          settings: {
            width: 'fit-content',
            max_width: 'normal',
            alignment: 'left',
            type_preset: 'rte',
            font: 'var(--font-body--family)',
            font_size: '1rem',
            line_height: 'normal',
            letter_spacing: 'normal',
            case: 'none',
            wrap: 'pretty',
            color: 'var(--color-foreground)',
            background: false,
            background_color: '#00000026',
            corner_radius: 0,
            'padding-block-start': 4,
            'padding-block-end': 0,
            'padding-inline-start': 0,
            'padding-inline-end': 0,
          },
        },
        'price': {
          id: 'price',
          type: 'price',
          name: 'Product price',
          settings: {
            show_sale_price_first: true,
            show_installments: false,
            show_tax_info: false,
            type_preset: 'h6',
            width: '100%',
            alignment: 'left',
            font: 'var(--font-body--family)',
            font_size: '1rem',
            line_height: 'normal',
            letter_spacing: 'normal',
            case: 'none',
            color: 'var(--color-foreground)',
            'padding-block-start': 0,
            'padding-block-end': 0,
            'padding-inline-start': 0,
            'padding-inline-end': 0,
          },
        },
      },
      block_order: ['product-card-gallery', 'product_title', 'price'],
    };

    const section: LiquidSection = {
      id: 'products',
      type: 'product-list',
      settings: {
        collection: collection,
        layout_type: 'grid',
        carousel_on_mobile: false,
        max_products: Math.min(products.length, 8),
        columns: Math.min(products.length, 4),
        mobile_columns: '2',
        columns_gap: 8,
        rows_gap: 24,
        icons_style: 'arrow',
        icons_shape: 'none',
        section_width: 'page-width',
        horizontal_alignment: 'flex-start',
        gap: 28,
        color_scheme: 'scheme-1',
        'padding-block-start': 48,
        'padding-block-end': 48,
      },
      blocks: createBlocksArrayWithSize([headerBlock, productCardBlock]),  // Array with .size property for Liquid compatibility
      block_order: [],  // Tinker product-list doesn't use block_order for rendering
    };

    return {
      section,
      sectionType: 'product-list',
      collection,
    };
  }

  /**
   * Map a generic editor section to Tinker section
   * Falls back to compatible section types
   */
  mapEditorSection(section: Section): MappedSection | null {
    switch (section.type) {
      case 'features':
        return this.mapFeaturesToSection(section as Section & { content: FeaturesContent });
      case 'testimonials':
        return this.mapTestimonialsToSection(section as Section & { content: TestimonialsContent });
      case 'gallery':
        return this.mapGalleryToSection(section as Section & { content: GalleryContent });
      case 'text':
        return this.mapTextToSection(section as Section & { content: TextContent });
      default:
        console.warn(`Unknown section type: ${section.type}`);
        return null;
    }
  }

  /**
   * Get the section type name for a given purpose
   */
  getSectionType(purpose: 'hero' | 'featuredCollection' | 'richText' | 'mainProduct'): string {
    return this.sectionTypes[purpose];
  }

  /**
   * Map features to a media-with-content style section
   */
  private mapFeaturesToSection(section: Section & { content: FeaturesContent }): MappedSection {
    const blocksArray: SectionBlock[] = [];
    const blockOrder: string[] = [];

    // Title block
    const titleBlockId = generateBlockId('text');
    blocksArray.push({
      id: titleBlockId,
      type: 'text',
      settings: {
        text: `<h2>${section.title}</h2>`,
        type_preset: 'h2',
        width: '100%',
        alignment: 'center',
      },
    });
    blockOrder.push(titleBlockId);

    // Feature items as text blocks
    for (const item of section.content.items) {
      const itemBlockId = generateBlockId('text');
      blocksArray.push({
        id: itemBlockId,
        type: 'text',
        settings: {
          text: `<h4>${item.title}</h4><p>${item.description}</p>`,
          type_preset: 'rte',
          width: '100%',
          alignment: 'center',
        },
      });
      blockOrder.push(itemBlockId);
    }

    return {
      section: {
        id: section.id,
        type: 'section',
        settings: {
          section_width: 'page-width',
          color_scheme: 'scheme-1',
          content_direction: 'column',
          gap: 24,
          'padding-block-start': 48,
          'padding-block-end': 48,
        },
        blocks: createBlocksArrayWithSize(blocksArray),
        block_order: blockOrder,
      },
      sectionType: 'section',
    };
  }

  /**
   * Map testimonials to section
   */
  private mapTestimonialsToSection(section: Section & { content: TestimonialsContent }): MappedSection {
    const blocksArray: SectionBlock[] = [];
    const blockOrder: string[] = [];

    // Title block
    const titleBlockId = generateBlockId('text');
    blocksArray.push({
      id: titleBlockId,
      type: 'text',
      settings: {
        text: `<h2>${section.title}</h2>`,
        type_preset: 'h2',
        width: '100%',
        alignment: 'center',
      },
    });
    blockOrder.push(titleBlockId);

    // Testimonial items
    for (const item of section.content.items) {
      const itemBlockId = generateBlockId('text');
      blocksArray.push({
        id: itemBlockId,
        type: 'text',
        settings: {
          text: `<blockquote>"${item.quote}"</blockquote><p><strong>${item.author}</strong>${item.role ? `, ${item.role}` : ''}</p>`,
          type_preset: 'rte',
          width: '100%',
          alignment: 'center',
        },
      });
      blockOrder.push(itemBlockId);
    }

    return {
      section: {
        id: section.id,
        type: 'section',
        settings: {
          section_width: 'page-width',
          color_scheme: 'scheme-1',
          content_direction: 'column',
          gap: 32,
          'padding-block-start': 48,
          'padding-block-end': 48,
        },
        blocks: createBlocksArrayWithSize(blocksArray),
        block_order: blockOrder,
      },
      sectionType: 'section',
    };
  }

  /**
   * Map gallery to section
   */
  private mapGalleryToSection(section: Section & { content: GalleryContent }): MappedSection {
    const blocksArray: SectionBlock[] = [];
    const blockOrder: string[] = [];

    // Title block
    const titleBlockId = generateBlockId('text');
    blocksArray.push({
      id: titleBlockId,
      type: 'text',
      settings: {
        text: `<h2>${section.title}</h2>`,
        type_preset: 'h2',
        width: '100%',
        alignment: 'center',
      },
    });
    blockOrder.push(titleBlockId);

    return {
      section: {
        id: section.id,
        type: 'section',
        settings: {
          section_width: 'page-width',
          color_scheme: 'scheme-1',
          content_direction: 'column',
          gap: 24,
          'padding-block-start': 48,
          'padding-block-end': 48,
        },
        blocks: createBlocksArrayWithSize(blocksArray),
        block_order: blockOrder,
      },
      sectionType: 'section',
    };
  }

  /**
   * Map text to rich-text style section
   */
  private mapTextToSection(section: Section & { content: TextContent }): MappedSection {
    const blocksArray: SectionBlock[] = [];
    const blockOrder: string[] = [];

    // Title block
    const titleBlockId = generateBlockId('text');
    blocksArray.push({
      id: titleBlockId,
      type: 'text',
      settings: {
        text: `<h2>${section.title}</h2>`,
        type_preset: 'h2',
        width: '100%',
        alignment: 'center',
      },
    });
    blockOrder.push(titleBlockId);

    // Body text block
    const bodyBlockId = generateBlockId('text');
    const htmlContent = section.content.body
      .split('\n')
      .filter(p => p.trim())
      .map(p => `<p>${p}</p>`)
      .join('');

    blocksArray.push({
      id: bodyBlockId,
      type: 'text',
      settings: {
        text: htmlContent || '<p></p>',
        type_preset: 'rte',
        width: '100%',
        max_width: 'narrow',
        alignment: 'center',
      },
    });
    blockOrder.push(bodyBlockId);

    return {
      section: {
        id: section.id,
        type: 'section',
        settings: {
          section_width: 'page-width',
          color_scheme: 'scheme-1',
          content_direction: 'column',
          gap: 16,
          'padding-block-start': 48,
          'padding-block-end': 48,
        },
        blocks: createBlocksArrayWithSize(blocksArray),
        block_order: blockOrder,
      },
      sectionType: 'section',
    };
  }
}
