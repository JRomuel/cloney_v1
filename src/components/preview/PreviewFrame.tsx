'use client';

import { ReactNode } from 'react';
import { PreviewMode } from '@/types/editor';
import styles from './PreviewFrame.module.css';

interface PreviewFrameProps {
  children: ReactNode;
  mode: PreviewMode;
}

export function PreviewFrame({ children, mode }: PreviewFrameProps) {
  const frameClass = mode === 'mobile' ? styles.mobile : styles.desktop;

  return (
    <div className={`${styles.frame} ${frameClass}`}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
