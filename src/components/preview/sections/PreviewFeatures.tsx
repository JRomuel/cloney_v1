'use client';

import { FeaturesContent } from '@/types/editor';
import styles from './PreviewFeatures.module.css';

interface PreviewFeaturesProps {
  title: string;
  content: FeaturesContent;
}

export function PreviewFeatures({ title, content }: PreviewFeaturesProps) {
  if (content.items.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.empty}>Add features to see them here</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.grid}>
        {content.items.map((item) => (
          <div key={item.id} className={styles.feature}>
            <div className={styles.icon}>
              {item.icon || '✦'}
            </div>
            <h3 className={styles.featureTitle}>{item.title}</h3>
            <p className={styles.featureDescription}>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
