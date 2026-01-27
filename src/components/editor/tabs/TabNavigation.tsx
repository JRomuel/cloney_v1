'use client';

import { Tabs } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { EditorTab } from '@/types/editor';

const TABS: Array<{ id: EditorTab; content: string }> = [
  { id: 'homepage', content: 'Homepage' },
  { id: 'products', content: 'Products' },
  { id: 'styles', content: 'Styles' },
];

export function TabNavigation() {
  const { activeTab, setActiveTab } = useEditorStore();

  const selectedIndex = TABS.findIndex((tab) => tab.id === activeTab);

  const handleTabChange = (index: number) => {
    setActiveTab(TABS[index].id);
  };

  return (
    <Tabs
      tabs={TABS.map((tab) => ({
        id: tab.id,
        content: tab.content,
        accessibilityLabel: `${tab.content} tab`,
        panelID: `${tab.id}-panel`,
      }))}
      selected={selectedIndex}
      onSelect={handleTabChange}
      fitted
    />
  );
}
