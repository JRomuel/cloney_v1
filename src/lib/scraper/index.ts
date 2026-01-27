import * as cheerio from 'cheerio';
import { ScrapedData } from '@/types';
import { ScrapingError } from '@/errors';
import { scrapeStatic, needsDynamicScraping } from './static';
import { scrapeDynamic, isPlaywrightAvailable } from './dynamic';

export interface ScrapeOptions {
  forceDynamic?: boolean;
  timeout?: number;
}

export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapedData> {
  const { forceDynamic = false } = options;

  // Validate URL
  let normalizedUrl: string;
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new ScrapingError('Invalid URL protocol', url);
    }
    normalizedUrl = urlObj.href;
  } catch {
    throw new ScrapingError('Invalid URL format', url);
  }

  // If forcing dynamic scraping and it's available, use it
  if (forceDynamic) {
    if (!isPlaywrightAvailable()) {
      console.warn(`[Scraper] Dynamic scraping requested but unavailable, using static`);
    } else {
      console.log(`[Scraper] Using dynamic scraping for: ${normalizedUrl}`);
      return scrapeDynamic(normalizedUrl);
    }
  }

  // Try static scraping first (faster and works on serverless)
  let staticData: ScrapedData | null = null;
  let requiresDynamic = false;

  try {
    console.log(`[Scraper] Attempting static scraping for: ${normalizedUrl}`);
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Check if the page needs dynamic scraping
    requiresDynamic = needsDynamicScraping($);

    // Get static data regardless
    staticData = await scrapeStatic(normalizedUrl);
    console.log(`[Scraper] Static scraping completed`);
  } catch (error) {
    console.log(
      `[Scraper] Static scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // If dynamic scraping is needed and available, try it
  if ((requiresDynamic || !staticData) && isPlaywrightAvailable()) {
    console.log(`[Scraper] Attempting dynamic scraping...`);
    try {
      const dynamicData = await scrapeDynamic(normalizedUrl);
      console.log(`[Scraper] Dynamic scraping succeeded`);
      return dynamicData;
    } catch (dynamicError) {
      console.warn(
        `[Scraper] Dynamic scraping failed: ${dynamicError instanceof Error ? dynamicError.message : 'Unknown error'}`
      );
      // Fall through to use static data if available
    }
  } else if (requiresDynamic) {
    console.warn(`[Scraper] Page may require JavaScript but dynamic scraping unavailable on this platform`);
  }

  // Return static data if we have it
  if (staticData) {
    console.log(`[Scraper] Using static scraping results`);
    return staticData;
  }

  throw new ScrapingError(
    'Failed to scrape URL: both static and dynamic scraping failed or unavailable',
    normalizedUrl
  );
}

export function validateScrapedData(data: ScrapedData): boolean {
  // Must have at least some content
  if (!data.title && !data.description && data.headings.length === 0) {
    return false;
  }

  // Should have at least one of: colors, fonts, or images
  if (data.colors.length === 0 && data.fonts.length === 0 && data.images.length === 0) {
    return false;
  }

  return true;
}

export { scrapeStatic } from './static';
export { scrapeDynamic, closeBrowser, isPlaywrightAvailable } from './dynamic';
