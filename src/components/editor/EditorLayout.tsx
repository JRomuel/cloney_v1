'use client';

import { ReactNode } from 'react';
import styles from './EditorLayout.module.css';

interface EditorLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
}

export function EditorLayout({ leftPanel, rightPanel }: EditorLayoutProps) {
  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>{leftPanel}</div>
      <div className={styles.rightPanel}>{rightPanel}</div>
    </div>
  );
}
