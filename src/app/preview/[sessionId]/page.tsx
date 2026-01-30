'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getThemeRegistry, initializeDefaultTheme } from '@/lib/themes/core/ThemeRegistry';
import { editorStylesToSettings, createPageRenderContext } from '@/lib/themes/core/MockDataProvider';
import { getSectionMapper } from '@/lib/themes/adapters/ThemeSectionMapper';
import type { LiquidEngine } from '@/lib/themes/core/LiquidEngine';
import type {
  HomepageContent,
  EditableProduct,
  StyleSettings,
  ProductPageContent,
  ContactPageContent,
} from '@/types/editor';

// Default products to show when no products have been added
const DEFAULT_PRODUCTS: EditableProduct[] = [
  {
    id: 'default-1',
    title: 'Classic White T-Shirt',
    description: 'Premium cotton t-shirt with a comfortable fit',
    price: 29.99,
    tags: ['apparel', 'shirts'],
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
  },
  {
    id: 'default-2',
    title: 'Vintage Denim Jacket',
    description: 'Timeless denim jacket with classic styling',
    price: 89.99,
    tags: ['apparel', 'jackets'],
    imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400',
  },
  {
    id: 'default-3',
    title: 'Leather Crossbody Bag',
    description: 'Elegant leather bag for everyday use',
    price: 59.99,
    tags: ['accessories', 'bags'],
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
  },
  {
    id: 'default-4',
    title: 'Canvas Sneakers',
    description: 'Comfortable canvas sneakers for casual wear',
    price: 49.99,
    tags: ['footwear', 'sneakers'],
    imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400',
  },
];

interface SessionData {
  id: string;
  homepage: HomepageContent | null;
  products: EditableProduct[] | null;
  styles: StyleSettings | null;
  selectedThemeId: string | null;
  productPage?: ProductPageContent;
  contactPage?: ContactPageContent;
}

export default function ExternalPreviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [engine, setEngine] = useState<LiquidEngine | null>(null);
  const [css, setCss] = useState<string>('');
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch session data
  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch(`/api/editor/session/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        const data = await response.json();
        setSessionData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
        setIsLoading(false);
      }
    }

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  // Initialize theme engine when session data is loaded
  useEffect(() => {
    async function initializeTheme() {
      if (!sessionData) return;

      try {
        const themeId = sessionData.selectedThemeId || 'dawn';
        await initializeDefaultTheme(themeId);

        const registry = getThemeRegistry();
        const theme = registry.getActiveTheme();

        if (!theme) {
          throw new Error('No active theme found');
        }

        const loadedCss = await theme.loader.loadAllCSS();
        setEngine(theme.engine);
        setCss(loadedCss);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize theme');
        setIsLoading(false);
      }
    }

    initializeTheme();
  }, [sessionData]);

  // Render the preview when engine is ready
  useEffect(() => {
    async function renderPreview() {
      if (!engine || !sessionData) return;

      try {
        const homepage = sessionData.homepage || {
          hero: { title: 'My Store', subtitle: '', ctaText: 'Shop Now', ctaUrl: '/', backgroundImage: '' },
          sections: [],
        };
        const products = sessionData.products || [];
        const styles = sessionData.styles || {
          colors: { primary: '#000000', secondary: '#666666', accent: '#0066cc', background: '#ffffff', text: '#333333' },
          typography: { headingFont: 'Helvetica Neue', bodyFont: 'Helvetica Neue' },
        };
        const selectedThemeId = sessionData.selectedThemeId || 'dawn';

        const sectionMapper = getSectionMapper(selectedThemeId);
        const productsToRender = products.length > 0 ? products : DEFAULT_PRODUCTS;

        // Create base context
        const settingsObj = editorStylesToSettings(styles);
        const brandName = homepage.hero.title || 'My Store';
        const baseContext = createPageRenderContext(brandName, settingsObj, productsToRender);

        // Render section helper
        const renderSection = async (
          sectionType: string,
          sectionContext: Record<string, unknown>
        ): Promise<string> => {
          try {
            const loader = engine.getLoader();
            const templateContent = await loader.loadTemplate(`sections/${sectionType}.liquid`);
            const fullContext = { ...baseContext, ...sectionContext };
            return await engine.render(templateContent, fullContext, `section:${sectionType}`);
          } catch (err) {
            console.warn(`Failed to render section ${sectionType}:`, err);
            return `<!-- Section ${sectionType} failed to render -->`;
          }
        };

        // Render hero
        const heroMapping = sectionMapper.mapHero(homepage.hero);
        const heroHtml = await renderSection(heroMapping.sectionType, { section: heroMapping.section });

        // Render content sections
        const sectionHtmls: string[] = [];
        for (const section of homepage.sections) {
          if (!section.enabled) continue;

          const mapping = sectionMapper.mapEditorSection(section);
          if (!mapping) continue;

          const sectionHtml = await renderSection(mapping.sectionType, {
            section: mapping.section,
            collection: mapping.collection,
          });
          sectionHtmls.push(sectionHtml);
        }

        // Render products section
        const productsMapping = sectionMapper.mapProducts(productsToRender, 'Featured Products');
        const productsHtml = await renderSection(productsMapping.sectionType, {
          section: productsMapping.section,
          collection: productsMapping.collection,
        });

        const contentForLayout = `
          ${heroHtml}
          ${sectionHtmls.join('\n')}
          ${productsHtml}
        `.trim();

        // Render full page with layout
        const fullHtml = await engine.renderPage(contentForLayout, {
          ...baseContext,
          content_for_layout: contentForLayout,
        });

        setRenderedHtml(fullHtml);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render preview');
        setIsLoading(false);
      }
    }

    renderPreview();
  }, [engine, sessionData]);

  // Generate CSS variables from theme styles
  const cssVariables = useMemo(() => {
    if (!sessionData?.styles) return '';

    const themeStyles = sessionData.styles;

    const hexToRgb = (hex: string): string => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
      const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
      const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
      return `${r}, ${g}, ${b}`;
    };

    const bgRgb = hexToRgb(themeStyles.colors.background);
    const textRgb = hexToRgb(themeStyles.colors.text);
    const primaryRgb = hexToRgb(themeStyles.colors.primary);
    const secondaryRgb = hexToRgb(themeStyles.colors.secondary);
    const accentRgb = hexToRgb(themeStyles.colors.accent);

    return `
      :root {
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
        --color-base-text: ${textRgb};
        --color-base-background-1: ${bgRgb};
        --color-base-background-2: ${bgRgb};
        --color-base-solid-button-labels: ${bgRgb};
        --color-base-outline-button-labels: ${primaryRgb};
        --color-base-accent-1: ${accentRgb};
        --color-base-accent-2: ${secondaryRgb};
        --font-body-family: ${themeStyles.typography.bodyFont}, sans-serif;
        --font-body-style: normal;
        --font-body-weight: 400;
        --font-body-weight-bold: 700;
        --font-heading-family: ${themeStyles.typography.headingFont}, sans-serif;
        --font-heading-style: normal;
        --font-heading-weight: 400;
        --font-body-scale: 1;
        --font-heading-scale: 1;
        --page-width: 120rem;
        --spacing-sections-desktop: 36px;
        --spacing-sections-mobile: 24px;
        --grid-desktop-vertical-spacing: 16px;
        --grid-desktop-horizontal-spacing: 16px;
        --grid-mobile-vertical-spacing: 12px;
        --grid-mobile-horizontal-spacing: 12px;
        --product-card-corner-radius: 0;
        --product-card-border-width: 0;
        --product-card-border-opacity: 0;
        --product-card-shadow-opacity: 0;
        --product-card-image-padding: 0;
        --product-card-text-alignment: left;
        --media-radius: 0;
        --media-border-width: 0;
        --media-border-opacity: 0;
        --media-shadow-opacity: 0;
        --buttons-radius: 0;
        --buttons-border-thickness: 1px;
        --buttons-border-opacity: 1;
        --inputs-radius: 0;
        --inputs-border-width: 1px;
        --inputs-border-opacity: 0.55;
        --alpha-button-background: 1;
        --alpha-button-border: 1;
        --alpha-link: 0.85;
        --alpha-badge-border: 0.1;
      }
      body {
        color: rgba(var(--color-foreground), 0.75);
        background-color: rgb(var(--color-background));
      }
    `;
  }, [sessionData?.styles]);

  // Build the complete document HTML
  const documentHtml = useMemo(() => {
    if (!renderedHtml) return '';

    const baseHref = typeof window !== 'undefined' ? window.location.origin : '';
    const isFullDocument = renderedHtml.includes('<!doctype') || renderedHtml.includes('<!DOCTYPE') || renderedHtml.includes('<html');

    if (isFullDocument) {
      let doc = renderedHtml;

      if (doc.includes('<head>')) {
        doc = doc.replace('<head>', `<head>
  <base href="${baseHref}">
  <script>
    window.Shopify = {
      designMode: false,
      theme: { id: 'preview' },
      locale: 'en',
      currency: { active: 'USD', rate: '1.0' },
      routes: { root: '/' }
    };
    window.theme = { settings: {} };
  </script>`);
      }

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

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${baseHref}">
  <style>
    ${cssVariables}
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; min-height: 100%; }
    body {
      font-family: var(--font-body-family, 'Helvetica Neue', sans-serif);
      color: var(--color-foreground, #333);
      background-color: var(--color-background, #fff);
    }
    ${css}
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>
    `.trim();
  }, [renderedHtml, css, cssVariables]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ color: '#d72c0d', marginBottom: '16px' }}>Preview Error</h2>
          <p style={{ color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e5e5',
            borderTopColor: '#000',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#666' }}>Loading preview...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={documentHtml}
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
        display: 'block',
      }}
      title="Store Preview"
    />
  );
}
