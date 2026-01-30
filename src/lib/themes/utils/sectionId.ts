/**
 * Section ID utilities for generating Shopify-compatible section IDs
 *
 * Shopify section IDs follow the format: template--{templateId}__{sectionHandle}
 * For example: template--25496136908843__hero
 *
 * This format is used in CSS class generation within Liquid templates:
 * .section-{{ section.id }}-padding { padding-top: {{ section.settings.padding_top }}px; }
 *
 * Without proper IDs, CSS selectors won't match and styling breaks.
 */

/**
 * Mock template ID for preview mode.
 * In Shopify, this would be a real template asset ID (e.g., 25496136908843).
 * Using a consistent ID ensures CSS selectors work in preview.
 */
const PREVIEW_TEMPLATE_ID = '00000000000000';

/**
 * Generate a Shopify-compatible section ID
 *
 * @param sectionHandle - The section handle (e.g., 'hero', 'products', 'features-1')
 * @returns Formatted section ID (e.g., 'template--00000000000000__hero')
 *
 * @example
 * generateSectionId('hero') // => 'template--00000000000000__hero'
 * generateSectionId('products') // => 'template--00000000000000__products'
 * generateSectionId('features-1') // => 'template--00000000000000__features-1'
 */
export function generateSectionId(sectionHandle: string): string {
  return `template--${PREVIEW_TEMPLATE_ID}__${sectionHandle}`;
}

/**
 * Extract the section handle from a Shopify-formatted section ID
 *
 * @param sectionId - The full section ID (e.g., 'template--00000000000000__hero')
 * @returns The section handle (e.g., 'hero'), or the original ID if not in expected format
 */
export function extractSectionHandle(sectionId: string): string {
  const match = sectionId.match(/^template--\d+__(.+)$/);
  return match ? match[1] : sectionId;
}
