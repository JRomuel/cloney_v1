'use client';

import { ThemePreview } from '../preview/ThemePreview';
import { ThemePreviewToolbar } from '../preview/ThemePreviewToolbar';
import styles from './RightPanel.module.css';

interface RightPanelProps {
  shopDomain?: string;
}

export function RightPanel({ shopDomain }: RightPanelProps) {
  return (
    <div className={styles.container}>
      <ThemePreviewToolbar />
      <div className={styles.previewArea}>
        <ThemePreview />
      </div>
    </div>
  );
}
