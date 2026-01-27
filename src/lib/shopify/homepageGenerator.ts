import {
  HomepageContent,
  Section,
  FeaturesContent,
  TestimonialsContent,
  GalleryContent,
  TextContent,
} from '@/types/editor';

// Shopify theme types for templates/index.json
interface ShopifyBlock {
  type: string;
  settings: Record<string, unknown>;
}

interface ShopifySection {
  type: string;
  settings: Record<string, unknown>;
  blocks?: Record<string, ShopifyBlock>;
  block_order?: string[];
}

export interface ShopifyIndexJson {
  sections: Record<string, ShopifySection>;
  order: string[];
}

/**
 * Generate Shopify templates/index.json from editor homepage content
 */
export function generateHomepageJson(
  homepage: HomepageContent,
  collectionHandle?: string,
  productsSectionTitle?: string
): ShopifyIndexJson {
  const sections: Record<string, ShopifySection> = {};
  const order: string[] = [];

  // 1. Hero section (image-banner)
  sections['hero'] = convertHeroToImageBanner(homepage.hero);
  order.push('hero');

  // 2. Content sections (features, testimonials, gallery, text)
  homepage.sections.forEach((section, index) => {
    if (!section.enabled) return;

    const key = `${section.type}_${index}`;
    const converted = convertSection(section);
    if (converted) {
      sections[key] = converted;
      order.push(key);
    }
  });

  // 3. Products section (featured-collection) if collection exists
  if (collectionHandle) {
    sections['products'] = convertProductsToFeaturedCollection(collectionHandle, productsSectionTitle);
    order.push('products');
  }

  return { sections, order };
}

/**
 * Convert Hero content to Shopify image-banner section
 */
function convertHeroToImageBanner(hero: HomepageContent['hero']): ShopifySection {
  const blocks: Record<string, ShopifyBlock> = {};
  const blockOrder: string[] = [];

  // Heading block
  blocks['heading'] = {
    type: 'heading',
    settings: {
      heading: hero.title,
      heading_size: 'h0',
    },
  };
  blockOrder.push('heading');

  // Text/subtitle block - use richtext format
  if (hero.subtitle) {
    blocks['text'] = {
      type: 'text',
      settings: {
        text: formatAsRichtext(hero.subtitle),
        text_style: 'body',
      },
    };
    blockOrder.push('text');
  }

  // Button block
  if (hero.ctaText) {
    blocks['buttons'] = {
      type: 'buttons',
      settings: {
        button_label_1: hero.ctaText,
        button_link_1: hero.ctaUrl || '/collections/all',
        button_style_secondary_1: false,
        button_label_2: '',
        button_link_2: '',
        button_style_secondary_2: false,
      },
    };
    blockOrder.push('buttons');
  }

  return {
    type: 'image-banner',
    settings: {
      // NOTE: Cannot use external URLs for images - Shopify requires uploaded assets
      // Users can add images via Shopify theme editor after import
      image_overlay_opacity: 40,
      image_height: 'large',
      desktop_content_position: 'middle-center',
      show_text_box: false,
      desktop_content_alignment: 'center',
      color_scheme: 'scheme-1',
      image_behavior: 'none',
      mobile_content_alignment: 'center',
      stack_images_on_mobile: true,
      show_text_below: true,
    },
    blocks,
    block_order: blockOrder,
  };
}

/**
 * Convert a content section to its Shopify equivalent
 */
function convertSection(section: Section): ShopifySection | null {
  switch (section.type) {
    case 'features':
      return convertFeaturesToMulticolumn(section.title, section.content as FeaturesContent);
    case 'testimonials':
      return convertTestimonialsToMulticolumn(section.title, section.content as TestimonialsContent);
    case 'gallery':
      return convertGalleryToMulticolumn(section.title, section.content as GalleryContent);
    case 'text':
      return convertTextToRichText(section.title, section.content as TextContent);
    default:
      return null;
  }
}

/**
 * Convert Features to Shopify multicolumn section
 */
function convertFeaturesToMulticolumn(title: string, content: FeaturesContent): ShopifySection {
  const blocks: Record<string, ShopifyBlock> = {};
  const blockOrder: string[] = [];

  content.items.forEach((item, index) => {
    const blockId = `column_${index}`;
    blocks[blockId] = {
      type: 'column',
      settings: {
        title: item.title,
        text: formatAsRichtext(item.description),
        link_label: '',
        link: '',
      },
    };
    blockOrder.push(blockId);
  });

  return {
    type: 'multicolumn',
    settings: {
      title,
      heading_size: 'h1',
      image_width: 'full',
      image_ratio: 'adapt',
      columns_desktop: Math.min(content.items.length, 4),
      column_alignment: 'center',
      background_style: 'none',
      button_label: '',
      button_link: '',
      color_scheme: 'scheme-1',
      columns_mobile: '1',
      swipe_on_mobile: false,
    },
    blocks,
    block_order: blockOrder,
  };
}

/**
 * Convert Testimonials to Shopify multicolumn section
 * Matches the formatting used in SectionMapper.ts for preview consistency
 */
function convertTestimonialsToMulticolumn(title: string, content: TestimonialsContent): ShopifySection {
  const blocks: Record<string, ShopifyBlock> = {};
  const blockOrder: string[] = [];

  content.items.forEach((item, index) => {
    const blockId = `column_${index}`;
    // Format testimonial as: "quote" — role
    // NOTE: Cannot use external URLs for images - omit image setting
    const testimonialText = item.role
      ? `"${item.quote}" — ${item.role}`
      : `"${item.quote}"`;

    blocks[blockId] = {
      type: 'column',
      settings: {
        title: item.author || '',
        text: formatAsRichtext(testimonialText),
        link_label: '',
        link: '',
      },
    };
    blockOrder.push(blockId);
  });

  return {
    type: 'multicolumn',
    settings: {
      title,
      heading_size: 'h1',
      image_width: 'full',
      image_ratio: 'adapt',
      columns_desktop: Math.min(content.items.length, 3),
      column_alignment: 'center',
      background_style: 'primary',
      button_label: '',
      button_link: '',
      color_scheme: 'scheme-1',
      columns_mobile: '1',
      swipe_on_mobile: true,
    },
    blocks,
    block_order: blockOrder,
  };
}

/**
 * Convert Gallery to Shopify multicolumn section
 */
function convertGalleryToMulticolumn(title: string, content: GalleryContent): ShopifySection {
  const blocks: Record<string, ShopifyBlock> = {};
  const blockOrder: string[] = [];

  // NOTE: Cannot use external URLs for images - Shopify requires uploaded assets
  // For gallery, we create placeholder columns with captions
  // Users can add images via Shopify theme editor after import
  content.items.forEach((item, index) => {
    const blockId = `column_${index}`;
    blocks[blockId] = {
      type: 'column',
      settings: {
        title: item.caption || item.alt || `Image ${index + 1}`,
        text: '',
        link_label: '',
        link: '',
      },
    };
    blockOrder.push(blockId);
  });

  return {
    type: 'multicolumn',
    settings: {
      title,
      heading_size: 'h1',
      image_width: 'full',
      image_ratio: 'square',
      columns_desktop: Math.min(content.items.length, 4),
      column_alignment: 'center',
      background_style: 'none',
      button_label: '',
      button_link: '',
      color_scheme: 'scheme-1',
      columns_mobile: '2',
      swipe_on_mobile: false,
    },
    blocks,
    block_order: blockOrder,
  };
}

/**
 * Convert Text section to Shopify rich-text section
 * Matches the paragraph handling in SectionMapper.ts for preview consistency
 */
function convertTextToRichText(title: string, content: TextContent): ShopifySection {
  const blocks: Record<string, ShopifyBlock> = {};
  const blockOrder: string[] = [];

  // Heading block
  blocks['heading'] = {
    type: 'heading',
    settings: {
      heading: title,
      heading_size: 'h1',
    },
  };
  blockOrder.push('heading');

  // Text block - use richtext format
  blocks['text'] = {
    type: 'text',
    settings: {
      text: formatAsRichtext(content.body),
    },
  };
  blockOrder.push('text');

  return {
    type: 'rich-text',
    settings: {
      desktop_content_position: 'center',
      content_alignment: 'center',
      color_scheme: 'scheme-1',
      full_width: true,
    },
    blocks,
    block_order: blockOrder,
  };
}

/**
 * Convert Products section to Shopify featured-collection section
 */
function convertProductsToFeaturedCollection(
  collectionHandle: string,
  title: string = 'Featured Products'
): ShopifySection {
  return {
    type: 'featured-collection',
    settings: {
      title,
      heading_size: 'h1',
      description: '',
      show_description: false,
      description_style: 'body',
      collection: collectionHandle,
      products_to_show: 8,
      columns_desktop: 4,
      full_width: false,
      show_view_all: true,
      view_all_style: 'solid',
      enable_desktop_slider: false,
      color_scheme: 'scheme-1',
      image_ratio: 'adapt',
      image_shape: 'default',
      show_secondary_image: false,
      show_vendor: false,
      show_rating: false,
      enable_quick_add: false,
      columns_mobile: '2',
      swipe_on_mobile: false,
    },
  };
}

/**
 * Format text for Shopify section settings
 *
 * Dawn's sections use plain text type for most text fields, not richtext.
 * Strip any HTML and return clean plain text.
 */
function formatAsRichtext(text: string): string {
  if (!text) return '';

  // Strip any HTML tags
  const plainText = text.replace(/<[^>]*>/g, '');

  // Normalize whitespace
  return plainText.trim();
}
