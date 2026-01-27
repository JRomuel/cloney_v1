'use client';

import { EditableProduct } from '@/types/editor';
import styles from './PreviewProducts.module.css';

interface PreviewProductsProps {
  products: EditableProduct[];
}

export function PreviewProducts({ products }: PreviewProductsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Products</h2>
      <div className={styles.grid}>
        {products.map((product) => (
          <div key={product.id} className={styles.product}>
            <div className={styles.imageContainer}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className={styles.image}
                />
              ) : (
                <div className={styles.placeholder}>No image</div>
              )}
            </div>
            <div className={styles.info}>
              <h3 className={styles.productTitle}>{product.title}</h3>
              <p className={styles.price}>{formatPrice(product.price)}</p>
              {product.tags.length > 0 && (
                <div className={styles.tags}>
                  {product.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button className={styles.addToCart}>Add to Cart</button>
          </div>
        ))}
      </div>
    </section>
  );
}
