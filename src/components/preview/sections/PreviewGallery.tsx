'use client';

import { GalleryContent } from '@/types/editor';
import styles from './PreviewGallery.module.css';

interface PreviewGalleryProps {
  title: string;
  content: GalleryContent;
}

export function PreviewGallery({ title, content }: PreviewGalleryProps) {
  if (content.items.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.empty}>Add images to see them here</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.grid}>
        {content.items.map((item) => (
          <div key={item.id} className={styles.item}>
            {item.src ? (
              <img
                src={item.src}
                alt={item.alt}
                className={styles.image}
              />
            ) : (
              <div className={styles.placeholder}>No image</div>
            )}
            {item.caption && (
              <p className={styles.caption}>{item.caption}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
