'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import type { LiquidEngine } from '@/lib/themes/core/LiquidEngine';
import {
  editorStylesToSettings,
  createPageRenderContext,
} from '@/lib/themes/core/MockDataProvider';
import {
  mapProductToMainProduct,
  mapContactHeroToImageBanner,
  mapContactInfoToRichText,
} from '@/lib/themes/adapters/SectionMapper';
import { getSectionMapper } from '@/lib/themes/adapters/ThemeSectionMapper';
import type { UpdateType } from '@/lib/themes/types/theme.types';

export interface RenderResult {
  html: string;
  error: string | null;
}

export interface PreviewRendererState {
  renderedHtml: string;
  isRendering: boolean;
  error: string | null;
}

const CONTENT_DEBOUNCE_MS = 150;

export function usePreviewRenderer(engine: LiquidEngine | null) {
  const { homepage, products, styles, activePage, productPage, contactPage, selectedThemeId } = useEditorStore();

  const [state, setState] = useState<PreviewRendererState>({
    renderedHtml: '',
    isRendering: false,
    error: null,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRenderRef = useRef<string>('');

  // Get the appropriate section mapper for the selected theme
  const sectionMapper = useMemo(
    () => getSectionMapper(selectedThemeId),
    [selectedThemeId]
  );

  /**
   * Render a single section
   */
  const renderSection = useCallback(async (
    sectionType: string,
    sectionContext: Record<string, unknown>,
    baseContext: Record<string, unknown>
  ): Promise<string> => {
    if (!engine) return '';

    try {
      const loader = engine.getLoader();
      const templateContent = await loader.loadTemplate(`sections/${sectionType}.liquid`);
      const fullContext = { ...baseContext, ...sectionContext };
      return await engine.render(templateContent, fullContext, `section:${sectionType}`);
    } catch (err) {
      console.warn(`Failed to render section ${sectionType}:`, err);
      return `<!-- Section ${sectionType} failed to render -->`;
    }
  }, [engine]);

  /**
   * Render the homepage
   */
  const renderHomePage = useCallback(async (baseContext: Record<string, unknown>): Promise<string> => {
    // Render hero using theme-specific mapper
    const heroMapping = sectionMapper.mapHero(homepage.hero);
    const heroHtml = await renderSection(
      heroMapping.sectionType,
      { section: heroMapping.section },
      baseContext
    );

    // Render content sections using theme-specific mapper
    const sectionHtmls: string[] = [];
    for (const section of homepage.sections) {
      if (!section.enabled) continue;

      const mapping = sectionMapper.mapEditorSection(section);
      if (!mapping) continue;

      const sectionHtml = await renderSection(
        mapping.sectionType,
        {
          section: mapping.section,
          collection: mapping.collection,
        },
        baseContext
      );
      sectionHtmls.push(sectionHtml);
    }

    // Render products section if there are products
    let productsHtml = '';
    if (products.length > 0) {
      const productsMapping = sectionMapper.mapProducts(products, 'Featured Products');
      productsHtml = await renderSection(
        productsMapping.sectionType,
        {
          section: productsMapping.section,
          collection: productsMapping.collection,
        },
        baseContext
      );
    }

    return `
      ${heroHtml}
      ${sectionHtmls.join('\n')}
      ${productsHtml}
    `.trim();
  }, [homepage, products, renderSection, sectionMapper]);

  /**
   * Render the product page
   */
  const renderProductPage = useCallback(async (baseContext: Record<string, unknown>): Promise<string> => {
    // Get theme-specific section type for main product
    const mainProductSectionType = sectionMapper.getSectionType('mainProduct');

    const selectedProduct = productPage.selectedProductId
      ? products.find(p => p.id === productPage.selectedProductId)
      : null;

    if (!selectedProduct) {
      return `
        <div style="text-align: center; padding: 60px 20px;">
          <h2 style="margin-bottom: 16px;">No Product Selected</h2>
          <p style="color: #666;">Select a product from the editor to preview the product page.</p>
        </div>
      `;
    }

    // Render main product section (using existing mapper for now)
    const productMapping = mapProductToMainProduct(selectedProduct, productPage.layout);
    const productHtml = await renderSection(
      mainProductSectionType,
      {
        section: productMapping.section,
        product: productMapping.product,
      },
      baseContext
    );

    // Render additional sections using theme-specific mapper
    const sectionHtmls: string[] = [];
    for (const section of productPage.sections) {
      if (!section.enabled) continue;

      const mapping = sectionMapper.mapEditorSection(section);
      if (!mapping) continue;

      const sectionHtml = await renderSection(
        mapping.sectionType,
        {
          section: mapping.section,
          collection: mapping.collection,
        },
        baseContext
      );
      sectionHtmls.push(sectionHtml);
    }

    // Render recommendations if enabled using theme-specific mapper
    let recommendationsHtml = '';
    if (productPage.layout.showRecommendations && products.length > 1) {
      const otherProducts = products.filter(p => p.id !== selectedProduct.id).slice(0, 4);
      if (otherProducts.length > 0) {
        const recMapping = sectionMapper.mapProducts(otherProducts, 'You May Also Like');
        recommendationsHtml = await renderSection(
          recMapping.sectionType,
          {
            section: recMapping.section,
            collection: recMapping.collection,
          },
          baseContext
        );
      }
    }

    return `
      ${productHtml}
      ${sectionHtmls.join('\n')}
      ${recommendationsHtml}
    `.trim();
  }, [products, productPage, renderSection, sectionMapper]);

  /**
   * Render the contact page
   */
  const renderContactPage = useCallback(async (baseContext: Record<string, unknown>): Promise<string> => {
    // Get theme-specific section types
    const heroSectionType = sectionMapper.getSectionType('hero');
    const richTextSectionType = sectionMapper.getSectionType('richText');

    // Render hero (using existing contact hero mapper for now)
    const heroMapping = mapContactHeroToImageBanner(contactPage.hero);
    const heroHtml = await renderSection(
      heroSectionType,
      { section: heroMapping.section },
      baseContext
    );

    // Render contact info
    const contactInfoMapping = mapContactInfoToRichText(contactPage.contactInfo);
    const contactInfoHtml = await renderSection(
      richTextSectionType,
      { section: contactInfoMapping.section },
      baseContext
    );

    // Render additional sections using theme-specific mapper
    const sectionHtmls: string[] = [];
    for (const section of contactPage.sections) {
      if (!section.enabled) continue;

      const mapping = sectionMapper.mapEditorSection(section);
      if (!mapping) continue;

      const sectionHtml = await renderSection(
        mapping.sectionType,
        {
          section: mapping.section,
          collection: mapping.collection,
        },
        baseContext
      );
      sectionHtmls.push(sectionHtml);
    }

    return `
      ${heroHtml}
      ${contactInfoHtml}
      ${sectionHtmls.join('\n')}
    `.trim();
  }, [contactPage, renderSection, sectionMapper]);

  /**
   * Render the full page based on active page
   */
  const renderFullPage = useCallback(async (): Promise<RenderResult> => {
    if (!engine) {
      return { html: '', error: 'Engine not ready' };
    }

    try {
      // Create base context with editor data
      const settings = editorStylesToSettings(styles);
      const brandName = homepage.hero.title || 'My Store';
      const baseContext = createPageRenderContext(brandName, settings, products);

      // Render page content based on active page
      let contentForLayout: string;
      switch (activePage) {
        case 'product':
          contentForLayout = await renderProductPage(baseContext);
          break;
        case 'contact':
          contentForLayout = await renderContactPage(baseContext);
          break;
        case 'home':
        default:
          contentForLayout = await renderHomePage(baseContext);
          break;
      }

      // Render full page with layout
      const fullHtml = await engine.renderPage(contentForLayout, {
        ...baseContext,
        content_for_layout: contentForLayout,
      });

      // Debug logging
      console.log('[Preview] Rendered HTML length:', fullHtml.length);
      console.log('[Preview] Content for layout length:', contentForLayout.length);
      if (fullHtml.length < 100) {
        console.warn('[Preview] HTML seems too short:', fullHtml);
      }

      return { html: fullHtml, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Render failed';
      console.error('Render error:', err);
      return { html: '', error: errorMessage };
    }
  }, [engine, homepage, products, styles, activePage, renderHomePage, renderProductPage, renderContactPage]);

  /**
   * Trigger a render with appropriate debouncing
   */
  const triggerRender = useCallback((updateType: UpdateType = 'content') => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Style updates don't require re-render (CSS variables handle them)
    if (updateType === 'style') {
      return;
    }

    setState(prev => ({ ...prev, isRendering: true }));

    const doRender = async () => {
      const result = await renderFullPage();

      // Only update if the HTML has actually changed
      if (result.html !== lastRenderRef.current) {
        lastRenderRef.current = result.html;
        setState({
          renderedHtml: result.html,
          isRendering: false,
          error: result.error,
        });
      } else {
        setState(prev => ({ ...prev, isRendering: false }));
      }
    };

    // Structural changes render immediately, content changes are debounced
    if (updateType === 'structural') {
      doRender();
    } else {
      debounceTimerRef.current = setTimeout(doRender, CONTENT_DEBOUNCE_MS);
    }
  }, [renderFullPage]);

  /**
   * Force an immediate render
   */
  const forceRender = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setState(prev => ({ ...prev, isRendering: true }));
    const result = await renderFullPage();
    lastRenderRef.current = result.html;

    setState({
      renderedHtml: result.html,
      isRendering: false,
      error: result.error,
    });
  }, [renderFullPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    triggerRender,
    forceRender,
    renderSection,
  };
}
