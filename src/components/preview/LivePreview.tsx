'use client';

import { useEditorStore } from '@/stores/editorStore';
import { PreviewFrame } from './PreviewFrame';
import { PreviewHeader } from './sections/PreviewHeader';
import { PreviewHero } from './sections/PreviewHero';
import { PreviewFeatures } from './sections/PreviewFeatures';
import { PreviewTestimonials } from './sections/PreviewTestimonials';
import { PreviewGallery } from './sections/PreviewGallery';
import { PreviewProducts } from './sections/PreviewProducts';
import { PreviewFooter } from './sections/PreviewFooter';
import {
  FeaturesContent,
  TestimonialsContent,
  GalleryContent,
  TextContent,
} from '@/types/editor';
import styles from './LivePreview.module.css';

export function LivePreview() {
  const { homepage, products, styles: themeStyles, previewMode } = useEditorStore();

  // CSS custom properties for theme colors and fonts
  const cssVariables = {
    '--preview-primary': themeStyles.colors.primary,
    '--preview-secondary': themeStyles.colors.secondary,
    '--preview-background': themeStyles.colors.background,
    '--preview-text': themeStyles.colors.text,
    '--preview-accent': themeStyles.colors.accent,
    '--preview-heading-font': themeStyles.typography.headingFont,
    '--preview-body-font': themeStyles.typography.bodyFont,
  } as React.CSSProperties;

  return (
    <PreviewFrame mode={previewMode}>
      <div className={styles.preview} style={cssVariables}>
        <PreviewHeader brandName={homepage.hero.title} />

        <main className={styles.main}>
          <PreviewHero hero={homepage.hero} />

          {homepage.sections.map((section) => {
            if (!section.enabled) return null;

            switch (section.type) {
              case 'features':
                return (
                  <PreviewFeatures
                    key={section.id}
                    title={section.title}
                    content={section.content as FeaturesContent}
                  />
                );
              case 'testimonials':
                return (
                  <PreviewTestimonials
                    key={section.id}
                    title={section.title}
                    content={section.content as TestimonialsContent}
                  />
                );
              case 'gallery':
                return (
                  <PreviewGallery
                    key={section.id}
                    title={section.title}
                    content={section.content as GalleryContent}
                  />
                );
              case 'text':
                return (
                  <PreviewTextSection
                    key={section.id}
                    title={section.title}
                    content={section.content as TextContent}
                  />
                );
              default:
                return null;
            }
          })}

          {products.length > 0 && (
            <PreviewProducts products={products} />
          )}
        </main>

        <PreviewFooter brandName={homepage.hero.title} />
      </div>
    </PreviewFrame>
  );
}

// Simple text section preview
function PreviewTextSection({
  title,
  content,
}: {
  title: string;
  content: TextContent;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.textContent}>
        {content.body.split('\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
