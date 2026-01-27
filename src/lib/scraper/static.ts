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

  return images.slice(0, 20);
}

function extractProducts(
  $: cheerio.CheerioAPI,
  baseUrl: string
): Array<{
  name: string;
  description?: string;
  price?: string;
  imageUrl?: string;
}> {
  const products: Array<{
    name: string;
    description?: string;
    price?: string;
    imageUrl?: string;
  }> = [];

  // Look for common product card patterns
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

    // Extract image
    const imgSrc =
      $el.find('img').attr('src') ||
      $el.find('img').attr('data-src');
    const imageUrl = imgSrc ? resolveUrl(imgSrc, baseUrl) : undefined;

    products.push({
      name,
      description: description || undefined,
      price: price || undefined,
      imageUrl,
    });
  });

  return products;
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
