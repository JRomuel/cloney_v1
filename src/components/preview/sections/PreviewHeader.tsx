'use client';

import styles from './PreviewHeader.module.css';

interface PreviewHeaderProps {
  brandName: string;
}

export function PreviewHeader({ brandName }: PreviewHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>{brandName}</div>
        <nav className={styles.nav}>
          <a href="#" className={styles.navLink}>Shop</a>
          <a href="#" className={styles.navLink}>About</a>
          <a href="#" className={styles.navLink}>Contact</a>
        </nav>
        <div className={styles.actions}>
          <button className={styles.cartButton}>Cart (0)</button>
        </div>
      </div>
    </header>
  );
}
