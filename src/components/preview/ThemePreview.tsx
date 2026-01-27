'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useThemeEngine } from './hooks/useThemeEngine';
import { usePreviewRenderer } from './hooks/usePreviewRenderer';
import { ThemePreviewFrame } from './ThemePreviewFrame';
import styles from './ThemePreview.module.css';

export function ThemePreview() {
  const { homepage, products, styles: themeStyles, previewMode, activePage, productPage, contactPage } = useEditorStore();
  const { engine, css, isReady, error: engineError } = useThemeEngine();
  const {
    renderedHtml,
    isRendering,
    error: renderError,
    triggerRender,
    forceRender,
  } = usePreviewRenderer(engine);

  // Track previous values for change detection
  const prevHomepageRef = useRef(homepage);
  const prevProductsRef = useRef(products);
  const prevStylesRef = useRef(themeStyles);
  const prevActivePageRef = useRef(activePage);
  const prevProductPageRef = useRef(productPage);
  const prevContactPageRef = useRef(contactPage);
  const hasInitialRenderRef = useRef(false);

  // Initial render when engine is ready
  useEffect(() => {
    if (isReady && !hasInitialRenderRef.current) {
      hasInitialRenderRef.current = true;
      forceRender();
    }
  }, [isReady, forceRender]);

  // Detect changes and trigger appropriate render
  useEffect(() => {
    if (!isReady || !hasInitialRenderRef.current) return;

    const homepageChanged = homepage !== prevHomepageRef.current;
    const productsChanged = products !== prevProductsRef.current;
    const stylesChanged = themeStyles !== prevStylesRef.current;
    const activePageChanged = activePage !== prevActivePageRef.current;
    const productPageChanged = productPage !== prevProductPageRef.current;
    const contactPageChanged = contactPage !== prevContactPageRef.current;

    // Update refs
    prevHomepageRef.current = homepage;
    prevProductsRef.current = products;
    prevStylesRef.current = themeStyles;
    prevActivePageRef.current = activePage;
    prevProductPageRef.current = productPage;
    prevContactPageRef.current = contactPage;

    // Page change triggers immediate re-render
    if (activePageChanged) {
      triggerRender('structural');
      return;
    }

    // Determine update type based on which page is active
    if (stylesChanged && !homepageChanged && !productsChanged && !productPageChanged && !contactPageChanged) {
      // Style-only change: CSS variables handle it, no re-render needed
      triggerRender('style');
    } else if (activePage === 'home' && (homepageChanged || productsChanged)) {
      // Check if it's a structural change (sections added/removed)
      const prevSectionCount = prevHomepageRef.current?.sections?.length || 0;
      const currSectionCount = homepage.sections.length;
      const prevProductCount = prevProductsRef.current?.length || 0;
      const currProductCount = products.length;

      const isStructural =
        prevSectionCount !== currSectionCount ||
        prevProductCount !== currProductCount;

      triggerRender(isStructural ? 'structural' : 'content');
    } else if (activePage === 'product' && (productPageChanged || productsChanged)) {
      // Product page changes
      const prevSectionCount = prevProductPageRef.current?.sections?.length || 0;
      const currSectionCount = productPage.sections.length;
      const selectedProductChanged = productPage.selectedProductId !== prevProductPageRef.current?.selectedProductId;

      const isStructural = prevSectionCount !== currSectionCount || selectedProductChanged;
      triggerRender(isStructural ? 'structural' : 'content');
    } else if (activePage === 'contact' && contactPageChanged) {
      // Contact page changes
      const prevSectionCount = prevContactPageRef.current?.sections?.length || 0;
      const currSectionCount = contactPage.sections.length;

      const isStructural = prevSectionCount !== currSectionCount;
      triggerRender(isStructural ? 'structural' : 'content');
    }
  }, [homepage, products, themeStyles, activePage, productPage, contactPage, isReady, triggerRender]);

  // Error state
  const error = engineError || renderError;

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h3 className={styles.errorTitle}>Preview Error</h3>
          <p className={styles.errorMessage}>{error}</p>
          <button
            className={styles.retryButton}
            onClick={() => forceRender()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state (only show on initial load, not during updates)
  if (!isReady) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading theme...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ThemePreviewFrame
        html={renderedHtml}
        css={css}
        themeStyles={themeStyles}
        mode={previewMode}
        isLoading={isRendering && !renderedHtml}
      />
    </div>
  );
}
