'use client';

import { useEditorStore } from '@/stores/editorStore';
import { EditorPage } from '@/types/editor';
import styles from './PageSelector.module.css';

const PAGES: Array<{ id: EditorPage; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'product', label: 'Product' },
  { id: 'contact', label: 'Contact' },
];

export function PageSelector() {
  const { activePage, setActivePage } = useEditorStore();

  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>
        {PAGES.map((page) => (
          <button
            key={page.id}
            className={`${styles.pageButton} ${activePage === page.id ? styles.active : ''}`}
            onClick={() => setActivePage(page.id)}
          >
            {page.label}
          </button>
        ))}
      </div>
    </div>
  );
}
