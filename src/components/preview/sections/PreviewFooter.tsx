'use client';

import styles from './PreviewFooter.module.css';

interface PreviewFooterProps {
  brandName: string;
}

export function PreviewFooter({ brandName }: PreviewFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.column}>
            <div className={styles.logo}>{brandName}</div>
            <p className={styles.description}>
              Quality products for everyone.
            </p>
          </div>
          <div className={styles.column}>
            <h4 className={styles.heading}>Shop</h4>
            <ul className={styles.links}>
              <li><a href="#">All Products</a></li>
              <li><a href="#">New Arrivals</a></li>
              <li><a href="#">Best Sellers</a></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h4 className={styles.heading}>Company</h4>
            <ul className={styles.links}>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>
          <div className={styles.column}>
            <h4 className={styles.heading}>Legal</h4>
            <ul className={styles.links}>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Refund Policy</a></li>
            </ul>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>&copy; {currentYear} {brandName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
