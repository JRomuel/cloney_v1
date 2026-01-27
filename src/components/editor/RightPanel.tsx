'use client';

import { LivePreview } from '../preview/LivePreview';
import { PreviewToolbar } from '../preview/PreviewToolbar';
import styles from './RightPanel.module.css';

interface RightPanelProps {
  shopDomain?: string;
}

export function RightPanel({ shopDomain }: RightPanelProps) {
  return (
    <div className={styles.container}>
      <PreviewToolbar />
      <div className={styles.previewArea}>
        <LivePreview />
      </div>
    </div>
  );
}
