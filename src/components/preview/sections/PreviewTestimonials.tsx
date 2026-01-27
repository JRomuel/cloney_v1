'use client';

import { TestimonialsContent } from '@/types/editor';
import styles from './PreviewTestimonials.module.css';

interface PreviewTestimonialsProps {
  title: string;
  content: TestimonialsContent;
}

export function PreviewTestimonials({ title, content }: PreviewTestimonialsProps) {
  if (content.items.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.empty}>Add testimonials to see them here</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.grid}>
        {content.items.map((item) => (
          <div key={item.id} className={styles.testimonial}>
            <blockquote className={styles.quote}>"{item.quote}"</blockquote>
            <div className={styles.author}>
              {item.avatar && (
                <img
                  src={item.avatar}
                  alt={item.author}
                  className={styles.avatar}
                />
              )}
              <div>
                <div className={styles.authorName}>{item.author}</div>
                {item.role && (
                  <div className={styles.authorRole}>{item.role}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
