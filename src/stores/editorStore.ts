import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HomepageContent,
  EditableProduct,
  StyleSettings,
  EditorTab,
  EditorPage,
  PreviewMode,
  Section,
  HeroContent,
  ProductPageContent,
  ContactPageContent,
  defaultHomepageContent,
  defaultStyleSettings,
  defaultProductPageContent,
  defaultContactPageContent,
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
  productPage: ProductPageContent;
  contactPage: ContactPageContent;

  // Theme
  selectedThemeId: string;

  // UI
  activePage: EditorPage;
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

  // Actions - Product Page
  selectProductForPage: (productId: string | null) => void;
  updateProductPageLayout: (layout: Partial<ProductPageContent['layout']>) => void;
  addProductPageSection: (type: Section['type']) => void;
  updateProductPageSection: (sectionId: string, updates: Partial<Section>) => void;
  removeProductPageSection: (sectionId: string) => void;

  // Actions - Contact Page
  updateContactHero: (hero: Partial<ContactPageContent['hero']>) => void;
  updateContactInfo: (info: Partial<ContactPageContent['contactInfo']>) => void;
  addContactPageSection: (type: Section['type']) => void;
  updateContactPageSection: (sectionId: string, updates: Partial<Section>) => void;
  removeContactPageSection: (sectionId: string) => void;

  // Actions - Theme
  setSelectedThemeId: (themeId: string) => void;

  // Actions - UI
  setActivePage: (page: EditorPage) => void;
  setActiveTab: (tab: EditorTab) => void;
  setPreviewMode: (mode: PreviewMode) => void;

  // Actions - Session
  loadFromGeneration: (data: {
    sessionId: string;
    generationId: string;
    homepage: HomepageContent | null;
    products: EditableProduct[] | null;
    styles: StyleSettings | null;
    selectedThemeId?: string;
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
  productPage: defaultProductPageContent,
  contactPage: defaultContactPageContent,
  selectedThemeId: 'dawn',
  activePage: 'home' as EditorPage,
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
          // Only allow 1 product - replace instead of append
          products: [product],
          productPage: {
            ...state.productPage,
            selectedProductId: product.id,
          },
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

      // Product Page Actions
      selectProductForPage: (productId) =>
        set((state) => ({
          productPage: {
            ...state.productPage,
            selectedProductId: productId,
          },
          isDirty: true,
        })),

      updateProductPageLayout: (layoutUpdates) =>
        set((state) => ({
          productPage: {
            ...state.productPage,
            layout: { ...state.productPage.layout, ...layoutUpdates },
          },
          isDirty: true,
        })),

      addProductPageSection: (type) =>
        set((state) => ({
          productPage: {
            ...state.productPage,
            sections: [...state.productPage.sections, createSection(type)],
          },
          isDirty: true,
        })),

      updateProductPageSection: (sectionId, updates) =>
        set((state) => ({
          productPage: {
            ...state.productPage,
            sections: state.productPage.sections.map((section) =>
              section.id === sectionId ? { ...section, ...updates } : section
            ),
          },
          isDirty: true,
        })),

      removeProductPageSection: (sectionId) =>
        set((state) => ({
          productPage: {
            ...state.productPage,
            sections: state.productPage.sections.filter((s) => s.id !== sectionId),
          },
          isDirty: true,
        })),

      // Contact Page Actions
      updateContactHero: (heroUpdates) =>
        set((state) => ({
          contactPage: {
            ...state.contactPage,
            hero: { ...state.contactPage.hero, ...heroUpdates },
          },
          isDirty: true,
        })),

      updateContactInfo: (infoUpdates) =>
        set((state) => ({
          contactPage: {
            ...state.contactPage,
            contactInfo: { ...state.contactPage.contactInfo, ...infoUpdates },
          },
          isDirty: true,
        })),

      addContactPageSection: (type) =>
        set((state) => ({
          contactPage: {
            ...state.contactPage,
            sections: [...state.contactPage.sections, createSection(type)],
          },
          isDirty: true,
        })),

      updateContactPageSection: (sectionId, updates) =>
        set((state) => ({
          contactPage: {
            ...state.contactPage,
            sections: state.contactPage.sections.map((section) =>
              section.id === sectionId ? { ...section, ...updates } : section
            ),
          },
          isDirty: true,
        })),

      removeContactPageSection: (sectionId) =>
        set((state) => ({
          contactPage: {
            ...state.contactPage,
            sections: state.contactPage.sections.filter((s) => s.id !== sectionId),
          },
          isDirty: true,
        })),

      // Theme Actions
      setSelectedThemeId: (selectedThemeId) =>
        set({ selectedThemeId, isDirty: true }),

      // UI Actions
      setActivePage: (activePage) =>
        set({ activePage }),

      setActiveTab: (activeTab) =>
        set({ activeTab }),

      setPreviewMode: (previewMode) =>
        set({ previewMode }),

      // Session Actions
      loadFromGeneration: (data) => {
        // Only take the first product (limit to 1) and auto-select it
        const singleProduct = data.products?.[0] ? [data.products[0]] : [];
        const selectedProductId = singleProduct[0]?.id || null;

        set({
          sessionId: data.sessionId,
          generationId: data.generationId,
          homepage: data.homepage || defaultHomepageContent,
          products: singleProduct,
          styles: data.styles || defaultStyleSettings,
          selectedThemeId: data.selectedThemeId || 'dawn',
          productPage: {
            ...defaultProductPageContent,
            selectedProductId,
          },
          isDirty: false,
          lastSavedAt: new Date(),
        });
      },

      markSaved: () =>
        set({
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date(),
        }),

      setSaving: (isSaving) =>
        set({ isSaving }),

      reset: () =>
        set((state) => ({
          ...initialState,
          // Preserve selectedThemeId when resetting
          selectedThemeId: state.selectedThemeId,
        })),
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        generationId: state.generationId,
        homepage: state.homepage,
        products: state.products,
        styles: state.styles,
        productPage: state.productPage,
        contactPage: state.contactPage,
        selectedThemeId: state.selectedThemeId,
        activePage: state.activePage,
        activeTab: state.activeTab,
        previewMode: state.previewMode,
      }),
    }
  )
);
