'use client';

import { HeroContent } from '@/types/editor';
import styles from './PreviewHero.module.css';

interface PreviewHeroProps {
  hero: HeroContent;
}

export function PreviewHero({ hero }: PreviewHeroProps) {
  const backgroundStyle = hero.backgroundImage
    ? { backgroundImage: `url(${hero.backgroundImage})` }
    : {};

  return (
    <section
      className={`${styles.hero} ${hero.backgroundImage ? styles.hasImage : ''}`}
      style={backgroundStyle}
    >
      {hero.backgroundImage && <div className={styles.overlay} />}
      <div className={styles.content}>
        <h1 className={styles.title}>{hero.title}</h1>
        <p className={styles.subtitle}>{hero.subtitle}</p>
        {hero.ctaText && (
          <a href={hero.ctaUrl} className={styles.cta}>
            {hero.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
