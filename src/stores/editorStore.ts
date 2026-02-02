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
  FocusTarget,
  defaultHomepageContent,
  defaultStyleSettings,
  defaultProductPageContent,
  defaultContactPageContent,
} from '@/types/editor';

export type SessionStatus = 'editing' | 'imported';

export interface EditorState {
  // Session
  sessionId: string | null;
  generationId: string | null;
  sessionStatus: SessionStatus;

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
  isSessionLoaded: boolean; // True only after loadFromGeneration is called
  lastSavedAt: Date | null;

  // Focus/Highlight
  focusTarget: FocusTarget | null;

  // Actions - Homepage
  setHomepage: (homepage: HomepageContent) => void;
  updateHero: (hero: Partial<HeroContent>) => void;
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

  // Actions - Product Images
  reorderProductImages: (productId: string, startIndex: number, endIndex: number) => void;
  addProductImage: (productId: string, imageUrl: string) => void;
  removeProductImage: (productId: string, imageUrl: string) => void;

  // Actions - Product Page
  selectProductForPage: (productId: string | null) => void;
  updateProductPageLayout: (layout: Partial<ProductPageContent['layout']>) => void;
  updateProductPageSection: (sectionId: string, updates: Partial<Section>) => void;
  removeProductPageSection: (sectionId: string) => void;

  // Actions - Contact Page
  updateContactHero: (hero: Partial<ContactPageContent['hero']>) => void;
  updateContactInfo: (info: Partial<ContactPageContent['contactInfo']>) => void;
  updateContactPageSection: (sectionId: string, updates: Partial<Section>) => void;
  removeContactPageSection: (sectionId: string) => void;

  // Actions - Theme
  setSelectedThemeId: (themeId: string) => void;

  // Actions - UI
  setActivePage: (page: EditorPage) => void;
  setActiveTab: (tab: EditorTab) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setFocusTarget: (target: FocusTarget | null) => void;

  // Actions - Session
  loadFromGeneration: (data: {
    sessionId: string;
    generationId: string;
    homepage: HomepageContent | null;
    products: EditableProduct[] | null;
    styles: StyleSettings | null;
    selectedThemeId?: string;
    status?: SessionStatus;
  }) => void;
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  generationId: null,
  sessionStatus: 'editing' as SessionStatus,
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
  isSessionLoaded: false,
  lastSavedAt: null,
  focusTarget: null,
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

      // Product Image Actions
      reorderProductImages: (productId, startIndex, endIndex) =>
        set((state) => ({
          products: state.products.map((product) => {
            if (product.id !== productId) return product;
            const imageUrls = [...(product.imageUrls || [])];
            const [removed] = imageUrls.splice(startIndex, 1);
            imageUrls.splice(endIndex, 0, removed);
            return {
              ...product,
              imageUrls,
              // Update primary imageUrl to first image
              imageUrl: imageUrls[0],
            };
          }),
          isDirty: true,
        })),

      addProductImage: (productId, imageUrl) =>
        set((state) => ({
          products: state.products.map((product) => {
            if (product.id !== productId) return product;
            const imageUrls = [...(product.imageUrls || []), imageUrl];
            return {
              ...product,
              imageUrls,
              // Set primary imageUrl if this is the first image
              imageUrl: product.imageUrl || imageUrl,
            };
          }),
          isDirty: true,
        })),

      removeProductImage: (productId, imageUrl) =>
        set((state) => ({
          products: state.products.map((product) => {
            if (product.id !== productId) return product;
            const imageUrls = (product.imageUrls || []).filter((url) => url !== imageUrl);
            return {
              ...product,
              imageUrls,
              // Update primary imageUrl if it was removed
              imageUrl: product.imageUrl === imageUrl ? imageUrls[0] : product.imageUrl,
            };
          }),
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

      setFocusTarget: (focusTarget) =>
        set({ focusTarget }),

      // Session Actions
      loadFromGeneration: (data) => {
        const loadedProducts = data.products || [];
        const selectedProductId = loadedProducts[0]?.id || null;

        set({
          sessionId: data.sessionId,
          generationId: data.generationId,
          sessionStatus: data.status || 'editing',
          homepage: data.homepage || defaultHomepageContent,
          products: loadedProducts,
          styles: data.styles || defaultStyleSettings,
          selectedThemeId: data.selectedThemeId || 'dawn',
          productPage: {
            ...defaultProductPageContent,
            selectedProductId,
          },
          isDirty: false,
          isSessionLoaded: true,
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
        sessionStatus: state.sessionStatus,
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
      // Merge persisted state with initial state to handle missing fields from old data
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<EditorState>),
        // Ensure sessionStatus has a default if missing from old persisted data
        sessionStatus: (persistedState as Partial<EditorState>)?.sessionStatus || 'editing',
        // Always start with isSessionLoaded=false - must be set by loadFromGeneration
        isSessionLoaded: false,
        // Reset dirty state on page load to prevent stale auto-saves
        isDirty: false,
      }),
    }
  )
);

