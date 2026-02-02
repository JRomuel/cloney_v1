import * as cheerio from 'cheerio';
import { ScrapedData } from '@/types';
import { ScrapingError } from '@/errors';

export async function scrapeStatic(url: string): Promise<ScrapedData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new ScrapingError(`HTTP ${response.status}`, url);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract colors from CSS
  const colors = extractColors($, html);

  // Extract fonts
  const fonts = extractFonts($, html);

  // Extract headings
  const headings = extractHeadings($);

  // Extract images
  const images = extractImages($, url);

  // Extract product-like content
  const products = extractProducts($, url);

  // Extract meta information
  const title = $('title').text().trim() || $('h1').first().text().trim();
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('p').first().text().trim().substring(0, 200);

  // Extract logo
  const logoUrl = extractLogo($, url);

  // Extract body text for AI context
  const bodyText = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000);

  return {
    url,
    title,
    description,
    colors,
    fonts,
    headings,
    images,
    products,
    logoUrl,
    bodyText,
  };
}

function extractColors($: cheerio.CheerioAPI, html: string): string[] {
  const colors = new Set<string>();

  // Extract from inline styles
  const colorRegex =
    /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)/g;
  const matches = html.match(colorRegex) || [];
  matches.forEach((color) => colors.add(color.toLowerCase()));

  // Extract from style attributes
  $('[style*="color"], [style*="background"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const styleMatches = style.match(colorRegex) || [];
    styleMatches.forEach((color) => colors.add(color.toLowerCase()));
  });

  // Extract from style tags
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    const cssMatches = css.match(colorRegex) || [];
    cssMatches.forEach((color) => colors.add(color.toLowerCase()));
  });

  // Filter out common default colors
  const filtered = Array.from(colors).filter(
    (color) =>
      !['#000', '#000000', '#fff', '#ffffff', 'rgb(0,0,0)', 'rgb(255,255,255)'].includes(
        color.replace(/\s/g, '')
      )
  );

  return filtered.slice(0, 10);
}

function extractFonts($: cheerio.CheerioAPI, html: string): string[] {
  const fonts = new Set<string>();

  // Extract from Google Fonts links
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const familyMatch = href.match(/family=([^&:]+)/);
    if (familyMatch) {
      familyMatch[1].split('|').forEach((f) => {
        fonts.add(decodeURIComponent(f.replace(/\+/g, ' ')));
      });
    }
  });

  // Extract from font-family declarations
  const fontRegex = /font-family:\s*['"]?([^'";,}]+)/gi;
  let match;
  while ((match = fontRegex.exec(html)) !== null) {
    const font = match[1].trim();
    if (font && !font.includes('var(') && font.length < 50) {
      fonts.add(font);
    }
  }

  // Filter out generic fonts
  const genericFonts = [
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'inherit',
    'initial',
  ];

  return Array.from(fonts)
    .filter((f) => !genericFonts.includes(f.toLowerCase()))
    .slice(0, 5);
}

function extractHeadings($: cheerio.CheerioAPI): string[] {
  const headings: string[] = [];

  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 200) {
      headings.push(text);
    }
  });

  return headings.slice(0, 10);
}

function extractImages(
  $: cheerio.CheerioAPI,
  baseUrl: string
): Array<{ src: string; alt?: string }> {
  const images: Array<{ src: string; alt?: string }> = [];
  const seenSrcs = new Set<string>();

  $('img').each((_, el) => {
    const src =
      $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');

    if (!src) return;

    const absoluteSrc = resolveUrl(src, baseUrl);
    if (seenSrcs.has(absoluteSrc)) return;
    seenSrcs.add(absoluteSrc);

    const alt = $(el).attr('alt');

    // Skip tiny images, icons, and tracking pixels
    const width = parseInt($(el).attr('width') || '0', 10);
    const height = parseInt($(el).attr('height') || '0', 10);
    if ((width > 0 && width < 50) || (height > 0 && height < 50)) return;

    images.push({ src: absoluteSrc, alt });
  });

  return images.slice(0, 30);
}

function extractProducts(
  $: cheerio.CheerioAPI,
  baseUrl: string
): Array<{
  name: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  imageUrls?: string[];
}> {
  const products: Array<{
    name: string;
    description?: string;
    price?: string;
    imageUrl?: string;
    imageUrls?: string[];
  }> = [];

  // Check if this is a single product page (e.g., /products/...)
  const isSingleProductPage = /\/products?\/[^/]+/.test(baseUrl);

  if (isSingleProductPage) {
    // Extract single product from product detail page
    const singleProduct = extractSingleProduct($, baseUrl);
    if (singleProduct) {
      products.push(singleProduct);
      return products;
    }
  }

  // Look for common product card patterns (for collection pages)
  const productSelectors = [
    '.product',
    '.product-card',
    '.product-item',
    '[data-product]',
    '.woocommerce-loop-product',
    '.shopify-product',
    '.grid__item',
    '.collection-product',
  ];

  const productElements = $(productSelectors.join(', ')).slice(0, 10);

  productElements.each((_, el) => {
    const $el = $(el);

    // Extract name
    const name =
      $el.find('h2, h3, h4, .product-title, .product-name').first().text().trim() ||
      $el.find('a').first().text().trim();

    if (!name || name.length < 2) return;

    // Extract price
    const priceText =
      $el.find('.price, .product-price, [class*="price"]').first().text().trim();
    const price = priceText.match(/[\d,.]+/)?.[0];

    // Extract description
    const description = $el
      .find('.description, .product-description, p')
      .first()
      .text()
      .trim()
      .substring(0, 200);

    // Extract up to 6 images per product
    const imageUrls: string[] = [];
    const seenUrls = new Set<string>();

    $el.find('img').each((_, imgEl) => {
      if (imageUrls.length >= 6) return false; // Stop after 6 images

      const imgSrc =
        $(imgEl).attr('src') ||
        $(imgEl).attr('data-src') ||
        $(imgEl).attr('data-lazy-src');

      if (!imgSrc) return;

      const absoluteUrl = resolveUrl(imgSrc, baseUrl);
      if (seenUrls.has(absoluteUrl)) return;
      seenUrls.add(absoluteUrl);

      // Skip tiny images
      const width = parseInt($(imgEl).attr('width') || '0', 10);
      const height = parseInt($(imgEl).attr('height') || '0', 10);
      if ((width > 0 && width < 50) || (height > 0 && height < 50)) return;

      imageUrls.push(absoluteUrl);
    });

    const imageUrl = imageUrls[0];

    products.push({
      name,
      description: description || undefined,
      price: price || undefined,
      imageUrl,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });
  });

  return products;
}

function extractSingleProduct(
  $: cheerio.CheerioAPI,
  baseUrl: string
): {
  name: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  imageUrls?: string[];
} | null {
  // Try to find product title from various common selectors
  const titleSelectors = [
    '.product__title',
    '.product-title',
    '.product-single__title',
    '.product-info__title',
    '[data-product-title]',
    'h1.title',
    '.product h1',
    'h1',
  ];

  let name = '';
  for (const selector of titleSelectors) {
    // Get text and normalize whitespace (collapse multiple spaces/newlines to single space)
    const rawText = $(selector).first().text().trim();
    const text = rawText.replace(/\s+/g, ' ').trim();
    // Take only the first line/sentence to avoid nested content pollution
    const cleanText = text.split(/[|\-–—]/).shift()?.trim() || text;

    if (cleanText && cleanText.length > 2 && cleanText.length < 200) {
      name = cleanText;
      break;
    }
  }

  if (!name) return null;

  // Extract price
  const priceSelectors = [
    '.product__price',
    '.product-price',
    '.price',
    '.product-single__price',
    '[data-product-price]',
    '.money',
    '[class*="price"]',
  ];

  let price: string | undefined;
  for (const selector of priceSelectors) {
    const priceText = $(selector).first().text().trim();
    const priceMatch = priceText.match(/[\d,.]+/);
    if (priceMatch) {
      price = priceMatch[0];
      break;
    }
  }

  // Extract description
  const descSelectors = [
    '.product__description',
    '.product-description',
    '.product-single__description',
    '.product-info__description',
    '[data-product-description]',
    '.rte',
    '.product-details',
  ];

  let description: string | undefined;
  for (const selector of descSelectors) {
    const text = $(selector).first().text().trim();
    if (text && text.length > 10) {
      description = text.substring(0, 500);
      break;
    }
  }

  // Extract product images
  const imageUrls: string[] = [];
  const seenUrls = new Set<string>();

  // Look for product gallery images
  const imageSelectors = [
    '.product__media img',
    '.product-gallery img',
    '.product-single__photo img',
    '.product-images img',
    '[data-product-media] img',
    '.product-photo-container img',
    '.product__image img',
    '.product-featured-img',
  ];

  for (const selector of imageSelectors) {
    $(selector).each((_, imgEl) => {
      if (imageUrls.length >= 6) return false;

      const imgSrc =
        $(imgEl).attr('src') ||
        $(imgEl).attr('data-src') ||
        $(imgEl).attr('data-lazy-src') ||
        $(imgEl).attr('data-zoom');

      if (!imgSrc) return;

      const absoluteUrl = resolveUrl(imgSrc, baseUrl);
      if (seenUrls.has(absoluteUrl)) return;
      seenUrls.add(absoluteUrl);

      imageUrls.push(absoluteUrl);
    });

    if (imageUrls.length > 0) break;
  }

  // Fallback: try to find any large images in the main content area
  if (imageUrls.length === 0) {
    $('main img, .product img, [role="main"] img').each((_, imgEl) => {
      if (imageUrls.length >= 6) return false;

      const imgSrc =
        $(imgEl).attr('src') ||
        $(imgEl).attr('data-src');

      if (!imgSrc) return;

      const absoluteUrl = resolveUrl(imgSrc, baseUrl);
      if (seenUrls.has(absoluteUrl)) return;

      // Skip tiny images
      const width = parseInt($(imgEl).attr('width') || '0', 10);
      const height = parseInt($(imgEl).attr('height') || '0', 10);
      if ((width > 0 && width < 100) || (height > 0 && height < 100)) return;

      seenUrls.add(absoluteUrl);
      imageUrls.push(absoluteUrl);
    });
  }

  return {
    name,
    description,
    price,
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };
}

function extractLogo($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
  // Try common logo selectors
  const logoSelectors = [
    '.logo img',
    '#logo img',
    '[class*="logo"] img',
    'header img',
    '.site-header img',
    'a[href="/"] img',
  ];

  for (const selector of logoSelectors) {
    const logoImg = $(selector).first();
    const src = logoImg.attr('src') || logoImg.attr('data-src');
    if (src) {
      return resolveUrl(src, baseUrl);
    }
  }

  // Try Open Graph image as fallback
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    return resolveUrl(ogImage, baseUrl);
  }

  return undefined;
}

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

export function needsDynamicScraping($: cheerio.CheerioAPI): boolean {
  // Check for signs that the page relies heavily on JavaScript
  const bodyText = $('body').text().trim();

  // Very little content in body
  if (bodyText.length < 100) return true;

  // React/Vue/Angular root elements with no content
  if ($('#root, #app, #__next').length > 0 && bodyText.length < 500) return true;

  // Loading indicators
  if ($('[class*="loading"], [class*="spinner"]').length > 0) return true;

  return false;
}
