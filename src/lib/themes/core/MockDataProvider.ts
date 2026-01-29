// Mock Shopify data provider for preview rendering

import type {
  ShopifyShop,
  ShopifyProduct,
  ShopifyCollection,
  ShopifySettings,
  ShopifyImage,
  ShopifyVariant,
  LiquidRenderContext,
} from '../types/theme.types';
import type { EditableProduct, StyleSettings } from '@/types/editor';

/**
 * Create a mock Shopify shop object
 */
export function createMockShop(name: string = 'My Store'): ShopifyShop {
  return {
    name,
    email: 'store@example.com',
    currency: 'USD',
    money_format: '${{amount}}',
    money_with_currency_format: '${{amount}} USD',
    customer_accounts_enabled: false, // Disable account links in preview
  };
}

/**
 * Create a mock Shopify image object
 */
export function createMockImage(
  src: string,
  alt: string = '',
  width: number = 600,
  height: number = 600
): ShopifyImage {
  return {
    src,
    alt,
    width,
    height,
  };
}

/**
 * Create a mock Shopify variant
 */
export function createMockVariant(
  id: number,
  title: string,
  price: number,
  available: boolean = true
): ShopifyVariant {
  return {
    id,
    title,
    price: price * 100, // Convert to cents
    available,
    sku: `SKU-${id}`,
  };
}

/**
 * Convert an editor product to a mock Shopify product
 */
export function editorProductToShopify(product: EditableProduct, index: number): ShopifyProduct {
  const handle = product.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const priceInCents = Math.round(product.price * 100);

  return {
    id: index + 1,
    title: product.title,
    handle,
    description: product.description,
    price: priceInCents,
    price_min: priceInCents,
    price_max: priceInCents,
    compare_at_price: undefined,
    featured_image: product.imageUrl
      ? createMockImage(product.imageUrl, product.title)
      : createMockImage('', product.title),
    images: product.imageUrl
      ? [createMockImage(product.imageUrl, product.title)]
      : [],
    vendor: product.vendor || 'Store',
    type: 'Product',
    tags: product.tags || [],
    available: true,
    url: `/products/${handle}`,
    variants: [createMockVariant(1, 'Default', product.price)],
  };
}

/**
 * Create a mock collection from editor products
 */
export function createMockCollection(
  title: string,
  products: EditableProduct[],
  handle: string = 'all'
): ShopifyCollection {
  const shopifyProducts = products.map((p, i) => editorProductToShopify(p, i));

  return {
    id: 1,
    title,
    handle,
    description: `Browse our ${title.toLowerCase()} collection`,
    image: undefined,
    products: shopifyProducts,
    products_count: shopifyProducts.length,
    url: `/collections/${handle}`,
  };
}

/**
 * Color object that supports both Dawn and Tinker color access patterns
 */
interface ShopifyColor {
  red: number;
  green: number;
  blue: number;
  rgb: string;
  rgba: string;
}

/**
 * Parse a hex color to RGB components with rgba support
 */
function hexToRgb(hex: string): ShopifyColor {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return {
    red: r,
    green: g,
    blue: b,
    rgb: `${r}, ${g}, ${b}`,
    rgba: `${r}, ${g}, ${b}, 1`,
  };
}

/**
 * Create a color scheme object for Shopify settings
 * Supports both Dawn and Tinker theme color scheme structures
 */
function createColorScheme(id: string, styles: StyleSettings) {
  const background = hexToRgb(styles.colors.background);
  const text = hexToRgb(styles.colors.text);
  const primary = hexToRgb(styles.colors.primary);
  const accent = hexToRgb(styles.colors.accent);
  // Create a slightly lighter/darker version for hover states
  const primaryHover = hexToRgb(styles.colors.accent);
  // Border color - slightly transparent text
  const border = hexToRgb(styles.colors.text);

  return {
    id,
    settings: {
      // Dawn-style properties
      background,
      background_gradient: '',
      text,
      shadow: text,
      button: primary,
      button_label: background,
      secondary_button_label: primary,
      // Tinker-style properties
      foreground: text,
      foreground_heading: text,
      primary: primary,
      primary_hover: primaryHover,
      border: border,
      // Button colors for Tinker
      primary_button_text: background,
      primary_button_background: primary,
      primary_button_border: primary,
      primary_button_hover_text: background,
      primary_button_hover_background: primaryHover,
      primary_button_hover_border: primaryHover,
      secondary_button_text: text,
      secondary_button_background: background,
      secondary_button_border: text,
      secondary_button_hover_text: background,
      secondary_button_hover_background: text,
      secondary_button_hover_border: text,
      // Input colors for Tinker
      input_background: background,
      input_text_color: text,
      input_border_color: border,
      input_hover_background: background,
      // Variant picker colors for Tinker
      variant_background_color: background,
      variant_border_color: border,
      variant_text_color: text,
      variant_hover_background_color: background,
      variant_hover_text_color: text,
      variant_hover_border_color: primary,
      selected_variant_background_color: primary,
      selected_variant_border_color: primary,
      selected_variant_text_color: background,
      selected_variant_hover_background_color: primaryHover,
      selected_variant_hover_text_color: background,
      selected_variant_hover_border_color: primaryHover,
    },
  };
}

/**
 * Create a font object that matches Shopify's font structure
 * The system? method check in Liquid is handled by the 'system?' property
 */
function createFontObject(fontFamily: string) {
  const font = {
    family: fontFamily,
    fallback_families: 'sans-serif',
    style: 'normal',
    weight: '400',
    system: true, // Mark as system font to skip @font-face loading
  };
  // Add system? for Liquid's method-style property access
  (font as Record<string, unknown>)['system?'] = true;
  return font;
}

/**
 * Convert editor styles to Shopify settings
 */
export function editorStylesToSettings(styles: StyleSettings): ShopifySettings {
  const headingFont = createFontObject(styles.typography.headingFont);
  const bodyFont = createFontObject(styles.typography.bodyFont);

  return {
    colors_primary: styles.colors.primary,
    colors_secondary: styles.colors.secondary,
    colors_background: styles.colors.background,
    colors_text: styles.colors.text,
    colors_accent: styles.colors.accent,
    // Dawn font settings
    type_header_font: headingFont,
    type_body_font: bodyFont,
    // Tinker font settings
    type_subheading_font: headingFont,
    type_heading_font: headingFont,
    type_accent_font: headingFont,
    // Typography size settings for Tinker
    type_size_paragraph: 16,
    type_size_h1: 48,
    type_size_h2: 36,
    type_size_h3: 28,
    type_size_h4: 22,
    type_size_h5: 18,
    type_size_h6: 16,
    // Font assignments for headings (body, heading, subheading, accent)
    type_font_h1: 'heading',
    type_font_h2: 'heading',
    type_font_h3: 'heading',
    type_font_h4: 'heading',
    type_font_h5: 'heading',
    type_font_h6: 'heading',
    type_font_button_primary: 'body',
    type_font_button_secondary: 'body',
    // Line height settings
    type_line_height_paragraph: 'body-normal',
    type_line_height_h1: 'heading-normal',
    type_line_height_h2: 'heading-normal',
    type_line_height_h3: 'heading-normal',
    type_line_height_h4: 'heading-normal',
    type_line_height_h5: 'heading-normal',
    type_line_height_h6: 'heading-normal',
    // Letter spacing settings
    type_letter_spacing_h1: 'heading-normal',
    type_letter_spacing_h2: 'heading-normal',
    type_letter_spacing_h3: 'heading-normal',
    type_letter_spacing_h4: 'heading-normal',
    type_letter_spacing_h5: 'heading-normal',
    type_letter_spacing_h6: 'heading-normal',
    // Text case settings
    type_case_h1: 'none',
    type_case_h2: 'none',
    type_case_h3: 'none',
    type_case_h4: 'none',
    type_case_h5: 'none',
    type_case_h6: 'none',
    button_text_case: 'none',
    button_text_case_primary: 'none',
    button_text_case_secondary: 'none',
    // Color schemes for both Dawn and Tinker themes
    color_schemes: [
      createColorScheme('scheme-1', styles),
      createColorScheme('scheme-2', styles),
      createColorScheme('scheme-3', styles),
      createColorScheme('scheme-4', styles),
      createColorScheme('scheme-5', styles),
    ],
    // Tinker UI settings
    pills_border_radius: 20,
    inputs_border_radius: 4,
    button_border_radius_primary: 4,
    button_border_radius_secondary: 4,
    primary_button_border_width: 1,
    secondary_button_border_width: 1,
    input_border_width: 1,
    popover_border_radius: 4,
    popover_border_width: 1,
    popover_border: 'solid',
    popover_border_opacity: 10,
    popover_drop_shadow: true,
    drawer_drop_shadow: true,
    variant_swatch_border_opacity: 30,
    variant_swatch_border_width: 1,
    variant_swatch_border_style: 'solid',
    variant_swatch_width: 36,
    variant_swatch_height: 36,
    variant_swatch_radius: 4,
    variant_button_radius: 4,
    variant_button_border_width: 1,
    icon_stroke: 'normal',
    cart_price_font: 'body',
    // Transition settings
    page_transition_enabled: false,
    transition_to_main_product: false,
    // Additional settings Dawn expects
    body_scale: 100,
    heading_scale: 100,
    page_width: 1200,
    spacing_sections: 36,
    spacing_grid_vertical: 16,
    spacing_grid_horizontal: 16,
    media_padding: 0,
    media_border_opacity: 0,
    media_border_thickness: 1,
    media_radius: 0,
    media_shadow_opacity: 0,
    media_shadow_horizontal_offset: 0,
    media_shadow_vertical_offset: 4,
    media_shadow_blur: 5,
    card_image_padding: 0,
    card_corner_radius: 0,
    card_text_alignment: 'left',
    card_border_thickness: 0,
    card_border_opacity: 0,
    card_shadow_opacity: 0,
    card_shadow_horizontal_offset: 0,
    card_shadow_vertical_offset: 4,
    card_shadow_blur: 5,
    collection_card_image_padding: 0,
    collection_card_corner_radius: 0,
    collection_card_text_alignment: 'left',
    collection_card_border_thickness: 0,
    collection_card_border_opacity: 0,
    collection_card_shadow_opacity: 0,
    collection_card_shadow_horizontal_offset: 0,
    collection_card_shadow_vertical_offset: 4,
    collection_card_shadow_blur: 5,
    blog_card_image_padding: 0,
    blog_card_corner_radius: 0,
    blog_card_text_alignment: 'left',
    blog_card_border_thickness: 0,
    blog_card_border_opacity: 0,
    blog_card_shadow_opacity: 0,
    blog_card_shadow_horizontal_offset: 0,
    blog_card_shadow_vertical_offset: 4,
    blog_card_shadow_blur: 5,
    badge_corner_radius: 4,
    popup_border_thickness: 1,
    popup_border_opacity: 10,
    popup_corner_radius: 0,
    popup_shadow_opacity: 0,
    popup_shadow_horizontal_offset: 0,
    popup_shadow_vertical_offset: 4,
    popup_shadow_blur: 5,
    drawer_border_thickness: 1,
    drawer_border_opacity: 10,
    drawer_shadow_opacity: 0,
    drawer_shadow_horizontal_offset: 0,
    drawer_shadow_vertical_offset: 4,
    drawer_shadow_blur: 5,
    text_boxes_border_opacity: 0,
    text_boxes_border_thickness: 0,
    text_boxes_radius: 0,
    text_boxes_shadow_opacity: 0,
    text_boxes_shadow_horizontal_offset: 0,
    text_boxes_shadow_vertical_offset: 4,
    text_boxes_shadow_blur: 5,
    buttons_radius: 0,
    buttons_border_thickness: 1,
    buttons_border_opacity: 100,
    buttons_shadow_opacity: 0,
    buttons_shadow_horizontal_offset: 0,
    buttons_shadow_vertical_offset: 4,
    buttons_shadow_blur: 5,
    inputs_radius: 0,
    inputs_border_thickness: 1,
    inputs_border_opacity: 55,
    inputs_shadow_opacity: 0,
    inputs_shadow_horizontal_offset: 0,
    inputs_shadow_vertical_offset: 4,
    inputs_shadow_blur: 5,
    variant_pills_radius: 40,
    variant_pills_border_thickness: 1,
    variant_pills_border_opacity: 55,
    variant_pills_shadow_opacity: 0,
    variant_pills_shadow_horizontal_offset: 0,
    variant_pills_shadow_vertical_offset: 4,
    variant_pills_shadow_blur: 5,
    animations_hover_elements: 'none',
    animations_reveal_on_scroll: false,
    cart_type: 'page',
    predictive_search_enabled: false,
    // Logo settings - null means no custom logo, use text
    logo: null,
    logo_width: 100,
    // Social media settings
    social_twitter_link: '',
    social_facebook_link: '',
    social_instagram_link: '',
    // Header settings
    show_search: true,
    enable_sticky_header: 'none',
    enable_transparent_header_home: false,
    enable_transparent_header_product: false,
    enable_transparent_header_collection: false,
  };
}

/**
 * Create default Shopify settings
 */
export function createDefaultSettings(): ShopifySettings {
  return {
    colors_primary: '#121212',
    colors_secondary: '#666666',
    colors_background: '#ffffff',
    colors_text: '#121212',
    colors_accent: '#121212',
    type_header_font: 'Assistant',
    type_body_font: 'Assistant',
  };
}

interface BaseRenderContext {
  shop: ShopifyShop;
  settings: ShopifySettings;
  request: {
    host: string;
    path: string;
    locale: {
      iso_code: string;
    };
    origin: string;
    page_type: string;
  };
  routes: {
    root_url: string;
    cart_add_url: string;
    cart_change_url: string;
    cart_update_url: string;
    cart_url: string;
    predictive_search_url: string;
    search_url: string;
    account_url: string;
    account_login_url: string;
    account_logout_url: string;
    account_register_url: string;
  };
  canonical_url: string;
  page_title: string;
  page_description: string;
  content_for_header: string;
  // Shopify-specific globals for template comparisons
  blank: string;
  empty: string;
  nil: null;
  // Cart object (empty by default for preview)
  cart: {
    item_count: number;
    items: unknown[];
    total_price: number;
    empty?: boolean;
  };
  // Customer object (null for guest)
  customer: null;
  // Localization object
  localization: {
    available_countries: unknown[];
    available_languages: unknown[];
    country: { iso_code: string; name: string };
    language: { iso_code: string; name: string };
  };
}

// Shopify's "blank" value - used for empty checks in templates
// In Shopify, `!= blank` checks if a value is truthy/non-empty
const BLANK = '';

/**
 * Create the base render context for Liquid templates
 */
export function createBaseRenderContext(
  shopName: string,
  settings: ShopifySettings
): BaseRenderContext {
  return {
    shop: createMockShop(shopName),
    settings,
    request: {
      host: 'preview.myshopify.com',
      path: '/',
      locale: {
        iso_code: 'en',
      },
      origin: 'https://preview.myshopify.com',
      page_type: 'index',
    },
    routes: {
      root_url: '/',
      cart_add_url: '/cart/add',
      cart_change_url: '/cart/change',
      cart_update_url: '/cart/update',
      cart_url: '/cart',
      predictive_search_url: '/search/suggest',
      search_url: '/search',
      account_url: '/account',
      account_login_url: '/account/login',
      account_logout_url: '/account/logout',
      account_register_url: '/account/register',
    },
    canonical_url: '/',
    page_title: shopName,
    page_description: `Welcome to ${shopName}`,
    content_for_header: '',
    // Shopify-specific globals
    blank: BLANK,
    empty: BLANK,
    nil: null,
    // Cart object (empty for preview)
    // In Shopify, cart == empty returns true if items.length == 0
    cart: {
      item_count: 0,
      items: [],
      total_price: 0,
      empty: true, // This allows `{% if cart.empty %}` checks
    },
    // Customer object (null for guest in preview)
    customer: null,
    // Localization object (minimal for preview)
    localization: {
      available_countries: [],
      available_languages: [],
      country: { iso_code: 'US', name: 'United States' },
      language: { iso_code: 'en', name: 'English' },
    },
  };
}

/**
 * Create announcement bar section context for rendering via {% sections 'header-group' %}
 * Template expects section.blocks[] with type 'announcement'
 */
function createAnnouncementBarContext(text: string = 'Welcome to our store') {
  return {
    id: 'announcement-bar',
    type: 'announcement-bar',
    settings: {
      color_scheme: 'scheme-1',
      auto_rotate: false,
      change_slides_speed: 5,
      show_line_separator: true,
      show_social: false,
      enable_country_selector: false,
      enable_language_selector: false,
    },
    blocks: [
      {
        id: 'announcement-0',
        type: 'announcement',
        shopify_attributes: '',
        settings: {
          text: text,
          link: '',
        },
      },
    ],
    block_order: ['announcement-0'],
  };
}

/**
 * Create header section context for rendering via {% section 'header' %}
 * Template expects various section.settings properties
 */
function createHeaderSectionContext(brandName: string) {
  return {
    id: 'header',
    type: 'header',
    settings: {
      logo: null,
      logo_width: 100,
      logo_text: brandName,
      logo_position: 'middle-left',
      mobile_logo_position: 'center',
      menu: {
        links: [
          { title: 'Home', handle: 'home', url: '/', active: true, current: true, child_active: false, links: [] },
          { title: 'Shop', handle: 'shop', url: '/collections/all', active: false, current: false, child_active: false, links: [] },
          { title: 'About', handle: 'about', url: '/pages/about', active: false, current: false, child_active: false, links: [] },
          { title: 'Contact', handle: 'contact', url: '/pages/contact', active: false, current: false, child_active: false, links: [] },
        ],
      },
      menu_items: [
        { title: 'Home', url: '/' },
        { title: 'Shop', url: '/collections/all' },
        { title: 'About', url: '/pages/about' },
        { title: 'Contact', url: '/pages/contact' },
      ],
      menu_type_desktop: 'dropdown',
      sticky_header_type: 'none',
      show_line_separator: true,
      enable_country_selector: false,
      enable_language_selector: false,
      enable_customer_avatar: false,
      color_scheme: 'scheme-1',
      menu_color_scheme: 'scheme-1',
      margin_bottom: 0,
      padding_top: 20,
      padding_bottom: 20,
    },
    blocks: [],
    block_order: [],
  };
}

/**
 * Create footer section context for rendering via {% section 'footer' %}
 * Template expects: section.blocks[] with type 'text' or 'link_list'
 * - text blocks: block.settings.heading, block.settings.text
 * - link_list blocks: block.settings.heading, block.settings.links[]
 */
function createFooterSectionContext(brandName: string) {
  return {
    id: 'footer',
    type: 'footer',
    settings: {},
    blocks: [
      {
        id: 'quick_links',
        type: 'link_list',
        shopify_attributes: '',
        settings: {
          heading: 'Quick links',
          // links is iterated directly: {% for link in block.settings.links %}
          links: [
            { title: 'Search', url: '/search' },
            { title: 'Shop All', url: '/collections/all' },
            { title: 'About Us', url: '/pages/about' },
            { title: 'Contact', url: '/pages/contact' },
          ],
        },
      },
      {
        id: 'about_text',
        type: 'text',
        shopify_attributes: '',
        settings: {
          heading: `About ${brandName}`,
          // text is rendered as HTML: {{ block.settings.text }}
          text: `<p>${brandName} offers quality products with excellent service. Thank you for shopping with us.</p>`,
        },
      },
    ],
    block_order: ['quick_links', 'about_text'],
  };
}

/**
 * Create a complete render context for a page
 */
export function createPageRenderContext(
  shopName: string,
  settings: ShopifySettings,
  products: EditableProduct[]
): LiquidRenderContext {
  const collection = createMockCollection('All Products', products);
  const allProducts: Record<string, ShopifyProduct> = {};

  for (const product of collection.products) {
    allProducts[product.handle] = product;
  }

  return {
    ...createBaseRenderContext(shopName, settings),
    content_for_layout: '',
    section: {
      id: 'main',
      type: 'main',
      settings: {},
      blocks: [],
      block_order: [],
    },
    collection,
    collections: {
      all: collection,
    },
    all_products: allProducts,
    // Section contexts for header/footer rendering
    // Note: Announcement bar context removed to avoid 404s for themes that don't have it
    sections: {
      header: createHeaderSectionContext(shopName),
      footer: createFooterSectionContext(shopName),
    },
  };
}

/**
 * Create section-specific context additions
 */
export function createSectionContext(
  sectionId: string,
  sectionType: string,
  settings: Record<string, unknown>,
  blocks: Array<{
    id: string;
    type: string;
    settings: Record<string, unknown>;
  }>
): { section: LiquidRenderContext['section'] } {
  return {
    section: {
      id: sectionId,
      type: sectionType,
      settings,
      blocks,
      block_order: blocks.map(b => b.id),
    },
  };
}
