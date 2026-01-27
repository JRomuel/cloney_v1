import { z } from 'zod';
import { ThemeSettings, GeneratedProduct } from '@/types';
import { AIGenerationError } from '@/errors';

// Relaxed schema for parsing (allows more flexibility)
const RelaxedThemeSettingsSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    text: z.string(),
    accent: z.string(),
  }),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string(),
  }),
  layout: z.object({
    headerStyle: z.string().transform((val) => {
      const valid = ['logo_center', 'logo_left', 'menu_center'];
      return valid.includes(val) ? val : 'logo_left';
    }),
    footerStyle: z.string().transform((val) => {
      const valid = ['minimal', 'detailed', 'links_only'];
      return valid.includes(val) ? val : 'minimal';
    }),
  }),
  brandName: z.string(),
  tagline: z.string().optional(),
});

const RelaxedProductSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 9.99 : num;
    }
    return val;
  }),
  tags: z.array(z.string()).optional().default([]),
  imageUrl: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
});

export function parseThemeResponse(response: string): ThemeSettings {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new AIGenerationError('No JSON found in theme response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = RelaxedThemeSettingsSchema.parse(parsed);

    // Normalize colors to hex format
    const normalizedColors = {
      primary: normalizeColor(validated.colors.primary),
      secondary: normalizeColor(validated.colors.secondary),
      background: normalizeColor(validated.colors.background),
      text: normalizeColor(validated.colors.text),
      accent: normalizeColor(validated.colors.accent),
    };

    return {
      ...validated,
      colors: normalizedColors,
      layout: {
        headerStyle: validated.layout.headerStyle as 'logo_center' | 'logo_left' | 'menu_center',
        footerStyle: validated.layout.footerStyle as 'minimal' | 'detailed' | 'links_only',
      },
    };
  } catch (error) {
    if (error instanceof AIGenerationError) {
      throw error;
    }
    throw new AIGenerationError(
      `Failed to parse theme response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function parseProductsResponse(response: string): GeneratedProduct[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new AIGenerationError('No JSON found in products response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Handle both { products: [...] } and direct array
    const productsArray = Array.isArray(parsed) ? parsed : parsed.products;

    if (!Array.isArray(productsArray)) {
      throw new AIGenerationError('Products must be an array');
    }

    const validatedProducts: GeneratedProduct[] = [];

    for (const product of productsArray) {
      try {
        const validated = RelaxedProductSchema.parse(product);
        validatedProducts.push({
          title: validated.title,
          description: validated.description,
          price: validated.price as number,
          tags: validated.tags || [],
          imageUrl: validated.imageUrl,
          vendor: validated.vendor,
          productType: validated.productType,
        });
      } catch {
        // Skip invalid products but continue with others
        console.warn('Skipping invalid product:', product);
      }
    }

    if (validatedProducts.length === 0) {
      throw new AIGenerationError('No valid products in response');
    }

    return validatedProducts;
  } catch (error) {
    if (error instanceof AIGenerationError) {
      throw error;
    }
    throw new AIGenerationError(
      `Failed to parse products response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function normalizeColor(color: string): string {
  color = color.trim();

  // Already hex
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color.toLowerCase();
  }

  // Short hex
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Color name - return a default
  const colorNames: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    orange: '#ffa500',
    purple: '#800080',
    pink: '#ffc0cb',
    gray: '#808080',
    grey: '#808080',
  };

  return colorNames[color.toLowerCase()] || '#000000';
}

export function validateAIResponse(theme: ThemeSettings, products: GeneratedProduct[]): boolean {
  // Theme must have all colors
  if (!theme.colors.primary || !theme.colors.secondary || !theme.colors.background) {
    return false;
  }

  // Theme must have fonts
  if (!theme.typography.headingFont || !theme.typography.bodyFont) {
    return false;
  }

  // Must have at least one product
  if (products.length === 0) {
    return false;
  }

  // All products must have title and price
  for (const product of products) {
    if (!product.title || product.price <= 0) {
      return false;
    }
  }

  return true;
}
