'use client';

import { useEffect, useRef, useCallback } from 'react';
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
 * Shadow DOM container for theme preview
 * Isolates theme styles from the app styles
 */
export function ThemePreviewFrame({
  html,
  css,
  themeStyles,
  mode,
  isLoading = false,
}: ThemePreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  /**
   * Generate CSS variables from theme styles
   */
  const getCssVariables = useCallback((styles: StyleSettings): string => {
    return `
      :host {
        --color-foreground: ${styles.colors.text};
        --color-background: ${styles.colors.background};
        --color-button: ${styles.colors.primary};
        --color-button-text: ${styles.colors.background};
        --color-link: ${styles.colors.accent};
        --color-border: rgba(18, 18, 18, 0.08);
        --color-base-text: ${styles.colors.text};
        --color-base-background-1: ${styles.colors.background};
        --color-base-background-2: ${styles.colors.background};
        --color-base-solid-button-labels: ${styles.colors.background};
        --color-base-outline-button-labels: ${styles.colors.primary};
        --color-base-accent-1: ${styles.colors.accent};
        --color-base-accent-2: ${styles.colors.secondary};
        --font-body-family: ${styles.typography.bodyFont}, sans-serif;
        --font-heading-family: ${styles.typography.headingFont}, sans-serif;
      }
    `;
  }, []);

  /**
   * Initialize or update the shadow DOM
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Create shadow root if it doesn't exist
    if (!shadowRootRef.current) {
      shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
    }

    const shadowRoot = shadowRootRef.current;

    // Build the complete shadow DOM content
    const cssVariables = getCssVariables(themeStyles);

    const shadowContent = `
      <style>
        ${cssVariables}

        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: var(--color-background, #fff);
        }

        * {
          box-sizing: border-box;
        }

        ${css}
      </style>
      <div class="theme-preview-content">
        ${html}
      </div>
    `;

    shadowRoot.innerHTML = shadowContent;
  }, [html, css, themeStyles, getCssVariables]);

  /**
   * Update only CSS variables when styles change (instant update)
   */
  useEffect(() => {
    if (!shadowRootRef.current) return;

    const styleElement = shadowRootRef.current.querySelector('style');
    if (styleElement) {
      // Update CSS variables without re-rendering HTML
      const cssVariables = getCssVariables(themeStyles);
      const currentStyle = styleElement.textContent || '';

      // Replace the CSS variables section
      const updatedStyle = currentStyle.replace(
        /:host\s*\{[^}]*\}/,
        cssVariables.trim()
      );

      styleElement.textContent = updatedStyle;
    }
  }, [themeStyles, getCssVariables]);

  const frameClass = mode === 'mobile' ? styles.mobile : styles.desktop;

  return (
    <div className={`${styles.frame} ${frameClass}`}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}
      <div
        ref={containerRef}
        className={styles.shadowContainer}
      />
    </div>
  );
}
