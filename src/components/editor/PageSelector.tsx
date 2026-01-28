'use client';

import { Select } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { EditorPage } from '@/types/editor';

const PAGE_OPTIONS = [
  { label: 'Home', value: 'home' },
  { label: 'Product', value: 'product' },
  { label: 'Contact', value: 'contact' },
];

export function PageSelector() {
  const { activePage, setActivePage } = useEditorStore();

  return (
    <Select
      label="Page"
      labelHidden
      options={PAGE_OPTIONS}
      value={activePage}
      onChange={(value) => setActivePage(value as EditorPage)}
    />
  );
}
