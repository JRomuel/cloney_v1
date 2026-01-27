// Section mapper: converts editor sections to Dawn theme section format

import type {
  Section,
  HeroContent,
  FeaturesContent,
  TestimonialsContent,
  GalleryContent,
  TextContent,
  EditableProduct,
  ProductPageContent,
  ContactPageContent,
} from '@/types/editor';
import type { LiquidSection, SectionBlock, ShopifyProduct } from '../types/theme.types';
import { createMockCollection, editorProductToShopify } from '../core/MockDataProvider';

/**
 * Generate a unique block ID
 */
function generateBlockId(): string {
  return `block_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Map Hero section to image-banner section
 */
export function mapHeroToImageBanner(hero: HeroContent): {
  section: LiquidSection;
  sectionType: string;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  // Heading block
  const headingBlockId = generateBlockId();
  blocks.push({
    id: headingBlockId,
    type: 'heading',
    settings: {
      heading: hero.title,
      heading_size: 'h0',
    },
  });
  blockOrder.push(headingBlockId);

  // Text block (subtitle)
  if (hero.subtitle) {
    const textBlockId = generateBlockId();
    blocks.push({
      id: textBlockId,
      type: 'text',
      settings: {
        text: `<p>${hero.subtitle}</p>`,
      },
    });
    blockOrder.push(textBlockId);
  }

  // Buttons block
  if (hero.ctaText) {
    const buttonsBlockId = generateBlockId();
    blocks.push({
      id: buttonsBlockId,
      type: 'buttons',
      settings: {
        button_label_1: hero.ctaText,
        button_link_1: hero.ctaUrl || '/collections/all',
        button_style_1: 'primary',
      },
    });
    blockOrder.push(buttonsBlockId);
  }

  return {
    section: {
      id: 'hero',
      type: 'image-banner',
      settings: {
        image: hero.backgroundImage || '',
        image_alt: hero.title,
        content_alignment: 'center',
      },
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'image-banner',
  };
}

/**
 * Map Features section to multicolumn section
 */
export function mapFeaturesToMulticolumn(
  section: Section & { content: FeaturesContent }
): {
  section: LiquidSection;
  sectionType: string;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  for (const item of section.content.items) {
    const blockId = generateBlockId();
    blocks.push({
      id: blockId,
      type: 'column',
      settings: {
        title: item.title,
        text: `<p>${item.description}</p>`,
        image: item.icon || '',
      },
    });
    blockOrder.push(blockId);
  }

  return {
    section: {
      id: section.id,
      type: 'multicolumn',
      settings: {
        title: section.title,
        heading_size: 'h1',
        heading_alignment: 'center',
        columns_desktop: Math.min(blocks.length, 4),
        columns_mobile: 1,
      },
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'multicolumn',
  };
}

/**
 * Map Testimonials section to multicolumn section
 */
export function mapTestimonialsToMulticolumn(
  section: Section & { content: TestimonialsContent }
): {
  section: LiquidSection;
  sectionType: string;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  for (const item of section.content.items) {
    const blockId = generateBlockId();
    blocks.push({
      id: blockId,
      type: 'column',
      settings: {
        title: '',
        text: `<p>"${item.quote}"</p>`,
        author: item.author,
        author_role: item.role || '',
        image: item.avatar || '',
      },
    });
    blockOrder.push(blockId);
  }

  return {
    section: {
      id: section.id,
      type: 'multicolumn',
      settings: {
        title: section.title,
        heading_size: 'h1',
        heading_alignment: 'center',
        columns_desktop: Math.min(blocks.length, 3),
        columns_mobile: 1,
      },
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'multicolumn',
  };
}

/**
 * Map Gallery section to multicolumn section
 */
export function mapGalleryToMulticolumn(
  section: Section & { content: GalleryContent }
): {
  section: LiquidSection;
  sectionType: string;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  for (const item of section.content.items) {
    const blockId = generateBlockId();
    blocks.push({
      id: blockId,
      type: 'column',
      settings: {
        title: item.caption || '',
        text: '',
        image: item.src,
        image_alt: item.alt,
      },
    });
    blockOrder.push(blockId);
  }

  return {
    section: {
      id: section.id,
      type: 'multicolumn',
      settings: {
        title: section.title,
        heading_size: 'h1',
        heading_alignment: 'center',
        columns_desktop: Math.min(blocks.length, 4),
        columns_mobile: 2,
      },
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'multicolumn',
  };
}

/**
 * Map Text section to rich-text section
 */
export function mapTextToRichText(
  section: Section & { content: TextContent }
): {
  section: LiquidSection;
  sectionType: string;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  // Heading block
  const headingBlockId = generateBlockId();
  blocks.push({
    id: headingBlockId,
    type: 'heading',
    settings: {
      heading: section.title,
      heading_size: 'h1',
    },
  });
  blockOrder.push(headingBlockId);

  // Text block
  const textBlockId = generateBlockId();
  // Convert newlines to HTML paragraphs
  const htmlContent = section.content.body
    .split('\n')
    .filter(p => p.trim())
    .map(p => `<p>${p}</p>`)
    .join('');

  blocks.push({
    id: textBlockId,
    type: 'text',
    settings: {
      text: htmlContent || '<p></p>',
    },
  });
  blockOrder.push(textBlockId);

  return {
    section: {
      id: section.id,
      type: 'rich-text',
      settings: {
        content_alignment: 'center',
        full_width: false,
      },
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'rich-text',
  };
}

/**
 * Map Products to featured-collection section
 */
export function mapProductsToFeaturedCollection(
  products: EditableProduct[],
  title: string = 'Featured Products'
): {
  section: LiquidSection;
  sectionType: string;
  collection: ReturnType<typeof createMockCollection>;
} {
  const collection = createMockCollection(title, products);

  return {
    section: {
      id: 'products',
      type: 'featured-collection',
      settings: {
        title,
        heading_size: 'h1',
        heading_alignment: 'left',
        products_to_show: Math.min(products.length, 8),
        columns_desktop: Math.min(products.length, 4),
        show_vendor: false,
        show_view_all: products.length > 4,
        view_all_label: 'View all',
      },
      blocks: [],
      block_order: [],
    },
    sectionType: 'featured-collection',
    collection,
  };
}

/**
 * Map header section
 */
export function mapHeader(
  brandName: string
): {
  section: LiquidSection;
  sectionType: string;
} {
  const menuItems = [
    { title: 'Home', url: '/' },
    { title: 'Shop', url: '/collections/all' },
    { title: 'About', url: '/pages/about' },
    { title: 'Contact', url: '/pages/contact' },
  ];

  return {
    section: {
      id: 'header',
      type: 'header',
      settings: {
        logo_text: brandName,
        menu_items: menuItems,
      },
      blocks: [],
      block_order: [],
    },
    sectionType: 'header',
  };
}

/**
 * Map footer section
 */
export function mapFooter(
  brandName: string
): {
  section: LiquidSection;
  sectionType: string;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  // About block
  const aboutBlockId = generateBlockId();
  blocks.push({
    id: aboutBlockId,
    type: 'text',
    settings: {
      heading: 'About',
      text: `<p>${brandName} offers quality products with excellent service.</p>`,
    },
  });
  blockOrder.push(aboutBlockId);

  // Quick links block
  const linksBlockId = generateBlockId();
  blocks.push({
    id: linksBlockId,
    type: 'link_list',
    settings: {
      heading: 'Quick links',
      links: [
        { title: 'Shop', url: '/collections/all' },
        { title: 'About', url: '/pages/about' },
        { title: 'Contact', url: '/pages/contact' },
      ],
    },
  });
  blockOrder.push(linksBlockId);

  return {
    section: {
      id: 'footer',
      type: 'footer',
      settings: {},
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'footer',
  };
}

/**
 * Map an editor section to a Dawn section
 */
export function mapEditorSection(section: Section): {
  section: LiquidSection;
  sectionType: string;
  collection?: ReturnType<typeof createMockCollection>;
} | null {
  switch (section.type) {
    case 'features':
      return mapFeaturesToMulticolumn(section as Section & { content: FeaturesContent });
    case 'testimonials':
      return mapTestimonialsToMulticolumn(section as Section & { content: TestimonialsContent });
    case 'gallery':
      return mapGalleryToMulticolumn(section as Section & { content: GalleryContent });
    case 'text':
      return mapTextToRichText(section as Section & { content: TextContent });
    default:
      console.warn(`Unknown section type: ${section.type}`);
      return null;
  }
}

/**
 * Map all editor content to Dawn sections
 */
export function mapAllContent(
  hero: HeroContent,
  sections: Section[],
  products: EditableProduct[],
  brandName: string
): {
  header: ReturnType<typeof mapHeader>;
  hero: ReturnType<typeof mapHeroToImageBanner>;
  sections: Array<ReturnType<typeof mapEditorSection>>;
  products: ReturnType<typeof mapProductsToFeaturedCollection> | null;
  footer: ReturnType<typeof mapFooter>;
} {
  const mappedSections = sections
    .filter(s => s.enabled)
    .map(s => mapEditorSection(s))
    .filter((s): s is NonNullable<ReturnType<typeof mapEditorSection>> => s !== null);

  return {
    header: mapHeader(brandName),
    hero: mapHeroToImageBanner(hero),
    sections: mappedSections,
    products: products.length > 0 ? mapProductsToFeaturedCollection(products) : null,
    footer: mapFooter(brandName),
  };
}

/**
 * Map a single product to main-product section format
 * Returns a full ShopifyProduct object that matches what main-product.liquid expects
 */
export function mapProductToMainProduct(
  product: EditableProduct,
  layout: ProductPageContent['layout']
): {
  section: LiquidSection;
  sectionType: string;
  product: ShopifyProduct;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  // Title block
  const titleBlockId = generateBlockId();
  blocks.push({
    id: titleBlockId,
    type: 'title',
    settings: {},
  });
  blockOrder.push(titleBlockId);

  // Price block
  const priceBlockId = generateBlockId();
  blocks.push({
    id: priceBlockId,
    type: 'price',
    settings: {},
  });
  blockOrder.push(priceBlockId);

  // Description block
  const descBlockId = generateBlockId();
  blocks.push({
    id: descBlockId,
    type: 'description',
    settings: {},
  });
  blockOrder.push(descBlockId);

  // Buy buttons block
  const buyBlockId = generateBlockId();
  blocks.push({
    id: buyBlockId,
    type: 'buy_buttons',
    settings: {
      show_dynamic_checkout: true,
    },
  });
  blockOrder.push(buyBlockId);

  // Convert editor product to full ShopifyProduct structure
  const shopifyProduct = editorProductToShopify(product, 0);

  return {
    section: {
      id: 'main-product',
      type: 'main-product',
      settings: {
        media_position: layout.imagePosition,
        hide_variants: false,
        enable_sticky_info: true,
      },
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'main-product',
    product: shopifyProduct,
  };
}

/**
 * Map contact page hero to image-banner section
 */
export function mapContactHeroToImageBanner(hero: ContactPageContent['hero']): {
  section: LiquidSection;
  sectionType: string;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  // Heading block
  const headingBlockId = generateBlockId();
  blocks.push({
    id: headingBlockId,
    type: 'heading',
    settings: {
      heading: hero.title,
      heading_size: 'h0',
    },
  });
  blockOrder.push(headingBlockId);

  // Text block (subtitle)
  if (hero.subtitle) {
    const textBlockId = generateBlockId();
    blocks.push({
      id: textBlockId,
      type: 'text',
      settings: {
        text: `<p>${hero.subtitle}</p>`,
      },
    });
    blockOrder.push(textBlockId);
  }

  return {
    section: {
      id: 'contact-hero',
      type: 'image-banner',
      settings: {
        image: '',
        image_alt: hero.title,
        content_alignment: 'center',
      },
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'image-banner',
  };
}

/**
 * Map contact info to rich-text section
 */
export function mapContactInfoToRichText(contactInfo: ContactPageContent['contactInfo']): {
  section: LiquidSection;
  sectionType: string;
} {
  const blocks: SectionBlock[] = [];
  const blockOrder: string[] = [];

  // Heading block
  const headingBlockId = generateBlockId();
  blocks.push({
    id: headingBlockId,
    type: 'heading',
    settings: {
      heading: 'Get in Touch',
      heading_size: 'h1',
    },
  });
  blockOrder.push(headingBlockId);

  // Text block with contact details
  const textBlockId = generateBlockId();
  const contactHtml = `
    <p><strong>Email:</strong> ${contactInfo.email}</p>
    <p><strong>Phone:</strong> ${contactInfo.phone}</p>
    <p><strong>Address:</strong> ${contactInfo.address}</p>
  `.trim();

  blocks.push({
    id: textBlockId,
    type: 'text',
    settings: {
      text: contactHtml,
    },
  });
  blockOrder.push(textBlockId);

  return {
    section: {
      id: 'contact-info',
      type: 'rich-text',
      settings: {
        content_alignment: 'center',
        full_width: false,
      },
      blocks,
      block_order: blockOrder,
    },
    sectionType: 'rich-text',
  };
}
