import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HomepageContent,
  EditableProduct,
  StyleSettings,
  EditorTab,
  PreviewMode,
  Section,
  HeroContent,
  defaultHomepageContent,
  defaultStyleSettings,
  createSection,
} from '@/types/editor';

export interface EditorState {
  // Session
  sessionId: string | null;
  generationId: string | null;

  // Content
  homepage: HomepageContent;
  products: EditableProduct[];
  styles: StyleSettings;

  // UI
  activeTab: EditorTab;
  previewMode: PreviewMode;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Actions - Homepage
  setHomepage: (homepage: HomepageContent) => void;
  updateHero: (hero: Partial<HeroContent>) => void;
  addSection: (type: Section['type']) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (startIndex: number, endIndex: number) => void;
  toggleSectionEnabled: (sectionId: string) => void;

  // Actions - Products
  setProducts: (products: EditableProduct[]) => void;
  updateProduct: (productId: string, updates: Partial<EditableProduct>) => void;
  removeProduct: (productId: string) => void;
  addProduct: (product: EditableProduct) => void;

  // Actions - Styles
  setStyles: (styles: StyleSettings) => void;
  updateColor: (key: keyof StyleSettings['colors'], value: string) => void;
  updateFont: (key: keyof StyleSettings['typography'], value: string) => void;

  // Actions - UI
  setActiveTab: (tab: EditorTab) => void;
  setPreviewMode: (mode: PreviewMode) => void;

  // Actions - Session
  loadFromGeneration: (data: {
    sessionId: string;
    generationId: string;
    homepage: HomepageContent | null;
    products: EditableProduct[] | null;
    styles: StyleSettings | null;
  }) => void;
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  generationId: null,
  homepage: defaultHomepageContent,
  products: [],
  styles: defaultStyleSettings,
  activeTab: 'homepage' as EditorTab,
  previewMode: 'desktop' as PreviewMode,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Homepage Actions
      setHomepage: (homepage) =>
        set({ homepage, isDirty: true }),

      updateHero: (heroUpdates) =>
        set((state) => ({
          homepage: {
            ...state.homepage,
            hero: { ...state.homepage.hero, ...heroUpdates },
          },
          isDirty: true,
        })),

      addSection: (type) =>
        set((state) => ({
          homepage: {
            ...state.homepage,
            sections: [...state.homepage.sections, createSection(type)],
          },
          isDirty: true,
        })),

      updateSection: (sectionId, updates) =>
        set((state) => ({
          homepage: {
            ...state.homepage,
            sections: state.homepage.sections.map((section) =>
              section.id === sectionId ? { ...section, ...updates } : section
            ),
          },
          isDirty: true,
        })),

      removeSection: (sectionId) =>
        set((state) => ({
          homepage: {
            ...state.homepage,
            sections: state.homepage.sections.filter((s) => s.id !== sectionId),
          },
          isDirty: true,
        })),

      reorderSections: (startIndex, endIndex) =>
        set((state) => {
          const sections = [...state.homepage.sections];
          const [removed] = sections.splice(startIndex, 1);
          sections.splice(endIndex, 0, removed);
          return {
            homepage: { ...state.homepage, sections },
            isDirty: true,
          };
        }),

      toggleSectionEnabled: (sectionId) =>
        set((state) => ({
          homepage: {
            ...state.homepage,
            sections: state.homepage.sections.map((section) =>
              section.id === sectionId
                ? { ...section, enabled: !section.enabled }
                : section
            ),
          },
          isDirty: true,
        })),

      // Product Actions
      setProducts: (products) =>
        set({ products, isDirty: true }),

      updateProduct: (productId, updates) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId ? { ...product, ...updates } : product
          ),
          isDirty: true,
        })),

      removeProduct: (productId) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
          isDirty: true,
        })),

      addProduct: (product) =>
        set((state) => ({
          products: [...state.products, product],
          isDirty: true,
        })),

      // Style Actions
      setStyles: (styles) =>
        set({ styles, isDirty: true }),

      updateColor: (key, value) =>
        set((state) => ({
          styles: {
            ...state.styles,
            colors: { ...state.styles.colors, [key]: value },
          },
          isDirty: true,
        })),

      updateFont: (key, value) =>
        set((state) => ({
          styles: {
            ...state.styles,
            typography: { ...state.styles.typography, [key]: value },
          },
          isDirty: true,
        })),

      // UI Actions
      setActiveTab: (activeTab) =>
        set({ activeTab }),

      setPreviewMode: (previewMode) =>
        set({ previewMode }),

      // Session Actions
      loadFromGeneration: (data) =>
        set({
          sessionId: data.sessionId,
          generationId: data.generationId,
          homepage: data.homepage || defaultHomepageContent,
          products: data.products || [],
          styles: data.styles || defaultStyleSettings,
          isDirty: false,
          lastSavedAt: new Date(),
        }),

      markSaved: () =>
        set({
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date(),
        }),

      setSaving: (isSaving) =>
        set({ isSaving }),

      reset: () =>
        set(initialState),
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        generationId: state.generationId,
        homepage: state.homepage,
        products: state.products,
        styles: state.styles,
        activeTab: state.activeTab,
        previewMode: state.previewMode,
      }),
    }
  )
);
