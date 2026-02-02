import { FocusTarget } from '@/types/editor';

/**
 * Maps focus targets to CSS selectors for the Dawn theme.
 * These selectors are based on the Dawn theme's HTML structure.
 */
export function focusTargetToSelector(target: FocusTarget): string | null {
  const { type, field, itemId, subItemId } = target;

  switch (type) {
    case 'hero':
      return getHeroSelector(field);
    case 'section':
      return getSectionSelector(field, itemId, subItemId);
    case 'product':
      return getProductSelector(field, itemId);
    case 'contact':
      return getContactSelector(field);
    default:
      return null;
  }
}

function getHeroSelector(field: string): string | null {
  // Dawn hero/banner section selectors
  switch (field) {
    case 'title':
      return '[id*="hero"] .banner__heading, [id*="banner"] .banner__heading, .banner__heading';
    case 'subtitle':
      return '[id*="hero"] .banner__text, [id*="banner"] .banner__text, .banner__text';
    case 'ctaText':
      return '[id*="hero"] .banner__buttons .button, [id*="banner"] .banner__buttons .button, .banner__buttons .button';
    case 'ctaUrl':
      return '[id*="hero"] .banner__buttons .button, [id*="banner"] .banner__buttons .button, .banner__buttons .button';
    case 'backgroundImage':
      return '[id*="hero"] .banner__media, [id*="banner"] .banner__media, .banner__media';
    default:
      return null;
  }
}

function getSectionSelector(field: string, itemId?: string, subItemId?: string): string | null {
  // If we have a sub-item (like a specific feature or testimonial)
  if (subItemId) {
    switch (field) {
      case 'title':
        return `[data-item-id="${subItemId}"] .multicolumn-card__heading, [data-item-id="${subItemId}"] h3`;
      case 'description':
        return `[data-item-id="${subItemId}"] .multicolumn-card__text, [data-item-id="${subItemId}"] p`;
      case 'quote':
        return `[data-item-id="${subItemId}"] .testimonial__quote, [data-item-id="${subItemId}"] blockquote`;
      case 'author':
        return `[data-item-id="${subItemId}"] .testimonial__author, [data-item-id="${subItemId}"] cite`;
      default:
        return null;
    }
  }

  // Section-level fields
  if (itemId) {
    switch (field) {
      case 'title':
        return `[id*="${itemId}"] .title, [id*="${itemId}"] h2, [data-section-id="${itemId}"] .title, [data-section-id="${itemId}"] h2`;
      case 'body':
        return `[id*="${itemId}"] .rte, [id*="${itemId}"] .rich-text__text, [data-section-id="${itemId}"] .rte`;
      default:
        return null;
    }
  }

  return null;
}

function getProductSelector(field: string, itemId?: string): string | null {
  if (!itemId) return null;

  // Product card selectors in collection/featured product sections
  switch (field) {
    case 'title':
      return `[data-product-id="${itemId}"] .card__heading, .product-card[data-id="${itemId}"] .card__heading, .card[data-product-id="${itemId}"] h3`;
    case 'description':
      return `[data-product-id="${itemId}"] .card__content, .product-card[data-id="${itemId}"] .card__content`;
    case 'price':
      return `[data-product-id="${itemId}"] .price, .product-card[data-id="${itemId}"] .price`;
    case 'imageUrl':
      return `[data-product-id="${itemId}"] .card__media, .product-card[data-id="${itemId}"] .card__media`;
    default:
      return null;
  }
}

function getContactSelector(field: string): string | null {
  switch (field) {
    case 'title':
      return '.contact__heading, .contact-section h2';
    case 'subtitle':
      return '.contact__text, .contact-section p';
    case 'email':
      return '.contact__email, [data-contact-field="email"]';
    case 'phone':
      return '.contact__phone, [data-contact-field="phone"]';
    case 'address':
      return '.contact__address, [data-contact-field="address"]';
    default:
      return null;
  }
}

/**
 * Sends a highlight message to the iframe.
 */
export function sendHighlightMessage(
  iframe: HTMLIFrameElement | null,
  target: FocusTarget | null,
  scrollIntoView: boolean = true
): void {
  if (!iframe?.contentWindow) return;

  if (!target) {
    iframe.contentWindow.postMessage({ type: 'CLEAR_HIGHLIGHT' }, '*');
    return;
  }

  const selector = focusTargetToSelector(target);
  if (selector) {
    iframe.contentWindow.postMessage(
      {
        type: 'HIGHLIGHT_ELEMENT',
        selector,
        scrollIntoView,
      },
      '*'
    );
  }
}

/**
 * JavaScript code to inject into the iframe for handling highlight messages.
 * This is self-contained and handles postMessage events.
 */
export const HIGHLIGHT_SCRIPT = `
<script id="highlight-script">
(function() {
  var highlightedEl = null;
  var HIGHLIGHT_STYLE = 'outline: 3px solid #007bff !important; outline-offset: 2px !important; box-shadow: 0 0 12px rgba(0,123,255,0.5) !important;';
  var TRANSITION_STYLE = 'transition: outline 0.2s ease, box-shadow 0.2s ease !important;';

  window.addEventListener('message', function(e) {
    if (e.data.type === 'CLEAR_HIGHLIGHT' && highlightedEl) {
      highlightedEl.style.cssText = highlightedEl._origStyle || '';
      highlightedEl = null;
    }
    if (e.data.type === 'HIGHLIGHT_ELEMENT' && e.data.selector) {
      // Clear previous highlight
      if (highlightedEl) {
        highlightedEl.style.cssText = highlightedEl._origStyle || '';
        highlightedEl = null;
      }

      // Try each selector (comma-separated) until we find a match
      var selectors = e.data.selector.split(',').map(function(s) { return s.trim(); });
      var el = null;

      for (var i = 0; i < selectors.length; i++) {
        try {
          el = document.querySelector(selectors[i]);
          if (el) break;
        } catch (err) {
          // Invalid selector, continue to next
        }
      }

      if (el) {
        el._origStyle = el.style.cssText;
        el.style.cssText += '; ' + TRANSITION_STYLE + HIGHLIGHT_STYLE;
        highlightedEl = el;

        if (e.data.scrollIntoView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  });
})();
</script>
`;
