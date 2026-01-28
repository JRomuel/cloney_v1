'use client';

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import type { PreviewMode, StyleSettings } from '@/types/editor';
import styles from './ThemePreviewFrame.module.css';

interface ThemePreviewFrameProps {
  html: string;
  css: string;
  themeStyles: StyleSettings;
  mode: PreviewMode;
  isLoading?: boolean;
}

/**
 * Iframe container for theme preview
 * Uses iframe with blob URL to create a true isolated viewport where:
 * - CSS media queries respond to the iframe's dimensions
 * - External resources can be loaded via base tag
 */
export function ThemePreviewFrame({
  html,
  css,
  themeStyles,
  mode,
  isLoading = false,
}: ThemePreviewFrameProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const prevBlobUrlRef = useRef<string | null>(null);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper to convert hex to RGB values
  const hexToRgb = (hex: string): string => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    return `${r}, ${g}, ${b}`;
  };

  // Generate CSS variables from theme styles
  // Dawn theme expects RGB values (e.g., "255, 255, 255") not hex
  const cssVariables = useMemo(() => {
    const bgRgb = hexToRgb(themeStyles.colors.background);
    const textRgb = hexToRgb(themeStyles.colors.text);
    const primaryRgb = hexToRgb(themeStyles.colors.primary);
    const secondaryRgb = hexToRgb(themeStyles.colors.secondary);
    const accentRgb = hexToRgb(themeStyles.colors.accent);

    return `
      :root {
        /* Dawn theme color scheme variables (RGB format) */
        --color-foreground: ${textRgb};
        --color-background: ${bgRgb};
        --color-button: ${primaryRgb};
        --color-button-text: ${bgRgb};
        --color-secondary-button: ${bgRgb};
        --color-secondary-button-text: ${primaryRgb};
        --color-link: ${accentRgb};
        --color-badge-foreground: ${textRgb};
        --color-badge-background: ${bgRgb};
        --color-badge-border: ${textRgb};
        --color-shadow: ${textRgb};
        --color-background-contrast: ${textRgb};
        --gradient-background: rgb(${bgRgb});

        /* Additional Dawn variables */
        --color-base-text: ${textRgb};
        --color-base-background-1: ${bgRgb};
        --color-base-background-2: ${bgRgb};
        --color-base-solid-button-labels: ${bgRgb};
        --color-base-outline-button-labels: ${primaryRgb};
        --color-base-accent-1: ${accentRgb};
        --color-base-accent-2: ${secondaryRgb};

        /* Typography */
        --font-body-family: ${themeStyles.typography.bodyFont}, sans-serif;
        --font-body-style: normal;
        --font-body-weight: 400;
        --font-body-weight-bold: 700;
        --font-heading-family: ${themeStyles.typography.headingFont}, sans-serif;
        --font-heading-style: normal;
        --font-heading-weight: 400;

        /* Spacing and sizing */
        --font-body-scale: 1;
        --font-heading-scale: 1;
        --page-width: 120rem;
        --spacing-sections-desktop: 36px;
        --spacing-sections-mobile: 24px;
        --grid-desktop-vertical-spacing: 16px;
        --grid-desktop-horizontal-spacing: 16px;
        --grid-mobile-vertical-spacing: 12px;
        --grid-mobile-horizontal-spacing: 12px;

        /* Card styles */
        --product-card-corner-radius: 0;
        --product-card-border-width: 0;
        --product-card-border-opacity: 0;
        --product-card-shadow-opacity: 0;
        --product-card-image-padding: 0;
        --product-card-text-alignment: left;

        /* Media styles */
        --media-radius: 0;
        --media-border-width: 0;
        --media-border-opacity: 0;
        --media-shadow-opacity: 0;

        /* Button styles */
        --buttons-radius: 0;
        --buttons-border-thickness: 1px;
        --buttons-border-opacity: 1;

        /* Input styles */
        --inputs-radius: 0;
        --inputs-border-width: 1px;
        --inputs-border-opacity: 0.55;

        /* Alpha values */
        --alpha-button-background: 1;
        --alpha-button-border: 1;
        --alpha-link: 0.85;
        --alpha-badge-border: 0.1;
      }

      /* Apply colors to body */
      body {
        color: rgba(var(--color-foreground), 0.75);
        background-color: rgb(var(--color-background));
      }
    `;
  }, [themeStyles]);

  // Build the complete iframe document
  const documentHtml = useMemo(() => {
    // Only compute baseHref on client-side to avoid hydration mismatch
    const baseHref = isMounted ? window.location.origin : '';

    // Check if html already contains a full document structure
    const isFullDocument = html.includes('<!doctype') || html.includes('<!DOCTYPE') || html.includes('<html');

    if (isFullDocument) {
      // Inject base tag and custom styles into the existing document
      let doc = html;

      // Add base tag and Shopify mock after <head> to enable relative URL resolution
      if (doc.includes('<head>')) {
        doc = doc.replace('<head>', `<head>
  <base href="${baseHref}">
  <script>
    // Mock Shopify global object for preview
    window.Shopify = {
      designMode: false,
      theme: { id: 'preview' },
      locale: 'en',
      currency: { active: 'USD', rate: '1.0' },
      routes: { root: '/' }
    };
    // Mock other common globals
    window.theme = { settings: {} };
  </script>`);
      }

      // Inject custom CSS variables before </head>
      const customStyles = `
  <style id="preview-custom-styles">
    ${cssVariables}
    ${css}
  </style>
`;
      if (doc.includes('</head>')) {
        doc = doc.replace('</head>', `${customStyles}</head>`);
      }

      return doc;
    }

    // Fallback for partial or empty HTML content
    // This creates a simple preview with just the content and styles
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${baseHref}">
  <style>
    ${cssVariables}

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }

    body {
      font-family: var(--font-body-family, 'Helvetica Neue', sans-serif);
      color: var(--color-foreground, #333);
      background-color: var(--color-background, #fff);
    }

    ${css}
  </style>
</head>
<body>
  ${html || '<div style="padding: 40px; text-align: center;"><h2>Preview Loading...</h2><p>Content will appear here once rendered.</p></div>'}
</body>
</html>
    `.trim();
  }, [html, css, cssVariables, isMounted]);

  // Create blob URL from the HTML content
  useEffect(() => {
    // Skip if not mounted or on server-side
    if (!isMounted) return;

    // Debug logging
    console.log('[ThemePreviewFrame] Creating blob URL');
    console.log('[ThemePreviewFrame] HTML prop length:', html.length);
    console.log('[ThemePreviewFrame] documentHtml length:', documentHtml.length);

    // Show structure of rendered HTML
    const hasDoctype = documentHtml.includes('<!doctype') || documentHtml.includes('<!DOCTYPE');
    const hasHead = documentHtml.includes('<head>');
    const hasBody = documentHtml.includes('<body');
    console.log('[ThemePreviewFrame] Has doctype:', hasDoctype, 'Has head:', hasHead, 'Has body:', hasBody);

    // Log first 1000 chars to see structure
    console.log('[ThemePreviewFrame] HTML preview:', documentHtml.substring(0, 1000));

    // Create a new blob URL
    const blob = new Blob([documentHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    console.log('[ThemePreviewFrame] Created blob URL:', url);

    // Store the old URL to revoke it
    const oldUrl = prevBlobUrlRef.current;
    prevBlobUrlRef.current = url;

    setBlobUrl(url);

    // Clean up the old blob URL
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }

    // Clean up the current blob URL on unmount
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [documentHtml, html, isMounted]);

  const frameClass = mode === 'mobile' ? styles.mobile : styles.desktop;

  return (
    <div className={`${styles.frame} ${frameClass}`}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}
      {blobUrl ? (
        <iframe
          src={blobUrl}
          className={styles.iframe}
          title="Theme Preview"
        />
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Loading preview...
        </div>
      )}
    </div>
  );
}
