import { chromium, Browser, Page } from 'playwright';
import { ScrapedData } from '@/types';
import { ScrapingError } from '@/errors';

let browserInstance: Browser | null = null;
let playwrightAvailable: boolean | null = null;

// Check if Playwright browsers are installed
export function isPlaywrightAvailable(): boolean {
  if (playwrightAvailable !== null) {
    return playwrightAvailable;
  }

  // In serverless environments (Vercel), Playwright browsers are typically not available
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isServerless) {
    console.warn('[Scraper] Serverless environment detected - Playwright disabled');
    playwrightAvailable = false;
    return false;
  }

  return true; // Assume available, will fail gracefully if not
}

async function getBrowser(): Promise<Browser> {
  if (!isPlaywrightAvailable()) {
    throw new ScrapingError(
      'Dynamic scraping unavailable: Playwright browsers not installed in this environment',
      'playwright'
    );
  }

  if (!browserInstance || !browserInstance.isConnected()) {
    try {
      browserInstance = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    } catch (error) {
      playwrightAvailable = false;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Check for common Playwright installation errors
      if (errorMsg.includes('Executable doesn\'t exist') || errorMsg.includes('npx playwright install')) {
        throw new ScrapingError(
          'Dynamic scraping unavailable: Playwright browsers not installed',
          'playwright'
        );
      }
      throw error;
    }
  }
  return browserInstance;
}

export async function scrapeDynamic(url: string): Promise<ScrapedData> {
  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Navigate and wait for network idle
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait a bit more for any lazy-loaded content
    await page.waitForTimeout(2000);

    // Extract data using page.evaluate
    const scrapedData = await page.evaluate((baseUrl) => {
      const extractColors = (): string[] => {
        const colors = new Set<string>();
        const colorRegex =
          /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g;

        // Get computed styles from key elements
        const elements = document.querySelectorAll(
          'body, header, main, footer, nav, h1, h2, h3, p, a, button, .hero, .banner'
        );

        elements.forEach((el) => {
          const styles = window.getComputedStyle(el);
          const bgColor = styles.backgroundColor;
          const textColor = styles.color;

          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
            colors.add(bgColor);
          }
          if (textColor) {
            colors.add(textColor);
          }
        });

        // Also check stylesheets
        const styleSheets = document.styleSheets;
        try {
          for (let i = 0; i < styleSheets.length; i++) {
            try {
              const sheet = styleSheets[i];
              const rules = sheet.cssRules || sheet.rules;
              for (let j = 0; j < rules.length; j++) {
                const rule = rules[j];
                if (rule instanceof CSSStyleRule) {
                  const cssText = rule.cssText;
                  const matches = cssText.match(colorRegex) || [];
                  matches.forEach((c) => colors.add(c));
                }
              }
            } catch {
              // Cross-origin stylesheets will throw
            }
          }
        } catch {
          // Ignore errors
        }

        return Array.from(colors)
          .filter(
            (c) =>
              !['rgb(0, 0, 0)', 'rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)'].includes(c)
          )
          .slice(0, 10);
      };

      const extractFonts = (): string[] => {
        const fonts = new Set<string>();

        const elements = document.querySelectorAll('h1, h2, h3, p, a, button, body');
        elements.forEach((el) => {
          const fontFamily = window.getComputedStyle(el).fontFamily;
          const fontNames = fontFamily.split(',').map((f) => f.trim().replace(/['"]/g, ''));
          fontNames.forEach((f) => {
            if (
              f &&
              !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'].includes(
                f.toLowerCase()
              )
            ) {
              fonts.add(f);
            }
          });
        });

        return Array.from(fonts).slice(0, 5);
      };

      const extractHeadings = (): string[] => {
        const headings: string[] = [];
        document.querySelectorAll('h1, h2, h3').forEach((el) => {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) {
            headings.push(text);
          }
        });
        return headings.slice(0, 10);
      };

      const extractImages = (): Array<{ src: string; alt?: string }> => {
        const images: Array<{ src: string; alt?: string }> = [];
        const seen = new Set<string>();

        document.querySelectorAll('img').forEach((img) => {
          const src = img.src || img.dataset.src || img.dataset.lazySrc;
          if (!src || seen.has(src)) return;
          seen.add(src);

          // Skip small images
          if (img.width > 0 && img.width < 50) return;
          if (img.height > 0 && img.height < 50) return;

          images.push({
            src,
            alt: img.alt || undefined,
          });
        });

        return images.slice(0, 20);
      };

      const extractProducts = (): Array<{
        name: string;
        description?: string;
        price?: string;
        imageUrl?: string;
      }> => {
        const products: Array<{
          name: string;
          description?: string;
          price?: string;
          imageUrl?: string;
        }> = [];

        const productSelectors = [
          '.product',
          '.product-card',
          '.product-item',
          '[data-product]',
          '.grid__item',
          '.collection-product',
        ];

        document.querySelectorAll(productSelectors.join(', ')).forEach((el) => {
          const nameEl = el.querySelector('h2, h3, h4, .product-title, .product-name, a');
          const name = nameEl?.textContent?.trim();
          if (!name || name.length < 2) return;

          const priceEl = el.querySelector('.price, .product-price, [class*="price"]');
          const priceMatch = priceEl?.textContent?.match(/[\d,.]+/);
          const price = priceMatch?.[0];

          const descEl = el.querySelector('.description, .product-description, p');
          const description = descEl?.textContent?.trim().substring(0, 200);

          const imgEl = el.querySelector('img') as HTMLImageElement | null;
          const imageUrl = imgEl?.src || imgEl?.dataset.src;

          products.push({
            name,
            description: description || undefined,
            price: price || undefined,
            imageUrl: imageUrl || undefined,
          });
        });

        return products.slice(0, 10);
      };

      const extractLogo = (): string | undefined => {
        const logoSelectors = [
          '.logo img',
          '#logo img',
          '[class*="logo"] img',
          'header img',
          '.site-header img',
        ];

        for (const selector of logoSelectors) {
          const img = document.querySelector(selector) as HTMLImageElement | null;
          if (img?.src) return img.src;
        }

        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          return ogImage.getAttribute('content') || undefined;
        }

        return undefined;
      };

      return {
        url: baseUrl,
        title:
          document.title ||
          document.querySelector('h1')?.textContent?.trim() ||
          '',
        description:
          document.querySelector('meta[name="description"]')?.getAttribute('content') ||
          document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
          document.querySelector('p')?.textContent?.trim().substring(0, 200) ||
          '',
        colors: extractColors(),
        fonts: extractFonts(),
        headings: extractHeadings(),
        images: extractImages(),
        products: extractProducts(),
        logoUrl: extractLogo(),
        bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().substring(0, 5000),
      };
    }, url);

    return scrapedData as ScrapedData;
  } catch (error) {
    throw new ScrapingError(
      error instanceof Error ? error.message : 'Dynamic scraping failed',
      url
    );
  } finally {
    if (page) {
      await page.close();
    }
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
