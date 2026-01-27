import { ScrapedData } from '@/types';

export const THEME_GENERATION_SYSTEM_PROMPT = `You are an expert web designer and Shopify theme specialist. Your task is to analyze scraped website data and generate Shopify theme settings that capture the essence of the original design.

You must respond with valid JSON matching this exact structure:
{
  "colors": {
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "background": "#hexcode",
    "text": "#hexcode",
    "accent": "#hexcode"
  },
  "typography": {
    "headingFont": "Font Name",
    "bodyFont": "Font Name"
  },
  "layout": {
    "headerStyle": "logo_center" | "logo_left" | "menu_center",
    "footerStyle": "minimal" | "detailed" | "links_only"
  },
  "brandName": "Brand Name",
  "tagline": "Optional tagline"
}

Guidelines:
- Use colors extracted from the website, or infer complementary colors if needed
- For fonts, choose from Shopify-compatible fonts (e.g., "Assistant", "DM Sans", "Lato", "Montserrat", "Open Sans", "Poppins", "Roboto", "Work Sans")
- If the scraped fonts aren't Shopify-compatible, choose the closest match
- The brandName should be extracted from the title or headings
- Choose layout styles that match the original site's structure`;

export const PRODUCT_GENERATION_SYSTEM_PROMPT = `You are an expert e-commerce copywriter. Your task is to generate Shopify product data based on scraped website content.

You must respond with valid JSON matching this exact structure:
{
  "products": [
    {
      "title": "Product Title",
      "description": "Product description with HTML formatting allowed",
      "price": 29.99,
      "tags": ["tag1", "tag2"],
      "vendor": "Brand Name",
      "productType": "Category"
    }
  ]
}

Guidelines:
- Generate 3-5 products based on the scraped content
- If actual products are found in the scraped data, use them as basis
- If no products found, infer products from the website's content and purpose
- Prices should be realistic for the product type
- Use appropriate tags for SEO and categorization
- Product descriptions should be engaging and informative`;

export function buildThemePrompt(scrapedData: ScrapedData): string {
  return `Analyze this website data and generate Shopify theme settings:

URL: ${scrapedData.url}
Title: ${scrapedData.title || 'Unknown'}
Description: ${scrapedData.description || 'No description'}

Detected Colors:
${scrapedData.colors.length > 0 ? scrapedData.colors.join(', ') : 'None detected'}

Detected Fonts:
${scrapedData.fonts.length > 0 ? scrapedData.fonts.join(', ') : 'None detected'}

Main Headings:
${scrapedData.headings.length > 0 ? scrapedData.headings.slice(0, 5).join('\n') : 'None detected'}

${scrapedData.logoUrl ? `Logo URL: ${scrapedData.logoUrl}` : ''}

Body Text Sample:
${scrapedData.bodyText?.substring(0, 1000) || 'No body text'}

Generate theme settings that capture this website's visual identity.`;
}

export function buildProductPrompt(scrapedData: ScrapedData): string {
  const existingProducts = scrapedData.products.length > 0
    ? `\nExisting Products Found:\n${scrapedData.products
        .map((p) => `- ${p.name}: ${p.price || 'No price'} - ${p.description || 'No description'}`)
        .join('\n')}`
    : '';

  return `Generate Shopify products based on this website data:

URL: ${scrapedData.url}
Title: ${scrapedData.title || 'Unknown'}
Description: ${scrapedData.description || 'No description'}

Main Headings:
${scrapedData.headings.length > 0 ? scrapedData.headings.slice(0, 5).join('\n') : 'None detected'}
${existingProducts}

Body Text Sample:
${scrapedData.bodyText?.substring(0, 1500) || 'No body text'}

Available Images:
${scrapedData.images.length > 0
  ? scrapedData.images.slice(0, 5).map((img) => `- ${img.alt || 'No alt'}: ${img.src}`).join('\n')
  : 'None available'}

Generate products that would fit this website's brand and purpose.`;
}
