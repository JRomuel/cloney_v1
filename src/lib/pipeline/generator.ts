import { scrapeUrl, validateScrapedData } from '@/lib/scraper';
import { createCompletion } from '@/lib/ai/openai';
import {
  THEME_GENERATION_SYSTEM_PROMPT,
  PRODUCT_GENERATION_SYSTEM_PROMPT,
  buildThemePrompt,
  buildProductPrompt,
} from '@/lib/ai/prompts';
import { parseThemeResponse, parseProductsResponse, validateAIResponse } from '@/lib/ai/parser';
import { decrypt } from '@/lib/utils/encryption';
import prisma from '@/lib/db/prisma';
import { ScrapedData, ThemeSettings, GeneratedProduct, GenerationStatus } from '@/types';
import { ScrapingError, AIGenerationError } from '@/errors';

// Note: Shopify theme/product creation is now handled by the import API
// These imports are kept for reference but not used in the pipeline anymore
// import { createGraphQLClient } from '@/lib/shopify/client';
// import { createTheme, updateThemeSettings, generateThemeName } from '@/lib/shopify/theme';
// import { createProducts } from '@/lib/shopify/product';

export interface GenerationContext {
  generationId: string;
  shopId: string;
  shopDomain: string;
  accessToken: string;
  sourceUrl: string;
}

export interface GenerationResult {
  success: boolean;
  themeId?: string;
  themeName?: string;
  productsCreated?: number;
  error?: string;
}

async function updateGenerationStatus(
  generationId: string,
  status: GenerationStatus,
  progress: number,
  additionalData?: Partial<{
    errorMessage: string;
    themeId: string;
    themeName: string;
    scrapedData: string;
    aiResponse: string;
  }>
): Promise<void> {
  await prisma.generation.update({
    where: { id: generationId },
    data: {
      status,
      progress,
      ...additionalData,
      updatedAt: new Date(),
    },
  });
}

export async function runGenerationPipeline(
  context: GenerationContext
): Promise<GenerationResult> {
  const { generationId, sourceUrl } = context;
  // Note: shopId, shopDomain, accessToken are used during import, not in the pipeline

  let scrapedData: ScrapedData | null = null;
  let themeSettings: ThemeSettings | null = null;
  let products: GeneratedProduct[] = [];

  try {
    // Step 1: Scrape the source URL
    console.log(`[Pipeline] Starting scrape for: ${sourceUrl}`);
    await updateGenerationStatus(generationId, 'scraping', 10);

    scrapedData = await scrapeUrl(sourceUrl);

    if (!validateScrapedData(scrapedData)) {
      throw new ScrapingError('Insufficient data scraped from URL', sourceUrl);
    }

    await updateGenerationStatus(generationId, 'scraping', 25, {
      scrapedData: JSON.stringify(scrapedData),
    });

    console.log(`[Pipeline] Scraping complete. Found ${scrapedData.colors.length} colors, ${scrapedData.products.length} products`);

    // Step 2: Generate theme settings with AI
    console.log(`[Pipeline] Generating theme settings with AI...`);
    await updateGenerationStatus(generationId, 'analyzing', 30);

    const themePrompt = buildThemePrompt(scrapedData);
    const themeResponse = await createCompletion({
      prompt: themePrompt,
      systemPrompt: THEME_GENERATION_SYSTEM_PROMPT,
      responseFormat: 'json',
    });

    themeSettings = parseThemeResponse(themeResponse);

    await updateGenerationStatus(generationId, 'analyzing', 45);
    console.log(`[Pipeline] Theme settings generated: ${themeSettings.brandName}`);

    // Step 3: Generate products with AI
    console.log(`[Pipeline] Generating products with AI...`);
    await updateGenerationStatus(generationId, 'analyzing', 50);

    const productPrompt = buildProductPrompt(scrapedData);
    const productResponse = await createCompletion({
      prompt: productPrompt,
      systemPrompt: PRODUCT_GENERATION_SYSTEM_PROMPT,
      responseFormat: 'json',
    });

    products = parseProductsResponse(productResponse);

    await updateGenerationStatus(generationId, 'analyzing', 60, {
      aiResponse: JSON.stringify({ theme: themeSettings, products }),
    });

    console.log(`[Pipeline] Generated ${products.length} products`);

    // Validate AI response
    if (!validateAIResponse(themeSettings, products)) {
      throw new AIGenerationError('AI response validation failed');
    }

    // Step 4: Mark as complete - Editor will handle Shopify import
    // The pipeline now stops here to allow user to edit content before importing
    await updateGenerationStatus(generationId, 'completed', 100);

    console.log(`[Pipeline] Analysis complete! Ready for editing.`);
    console.log(`[Pipeline] Generated theme: ${themeSettings.brandName}, ${products.length} products`);

    return {
      success: true,
      productsCreated: products.length,
    };
  } catch (error) {
    console.error(`[Pipeline] Error:`, error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    await updateGenerationStatus(generationId, 'failed', 0, {
      errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function getShopContext(shopDomain: string): Promise<{
  shopId: string;
  accessToken: string;
} | null> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
  });

  if (!shop || shop.uninstalledAt || !shop.accessToken) {
    return null;
  }

  try {
    const accessToken = decrypt(shop.accessToken);
    return {
      shopId: shop.id,
      accessToken,
    };
  } catch {
    return null;
  }
}
