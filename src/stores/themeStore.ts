import { create } from 'zustand';
import type { ThemeConfig } from '@/lib/themes/types/theme.types';

export interface ThemeState {
  // Currently selected theme
  activeThemeId: string;

  // Available themes (loaded from registry)
  availableThemes: ThemeConfig[];

  // Loading state
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setActiveTheme: (themeId: string) => void;
  setAvailableThemes: (themes: ThemeConfig[]) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  activeThemeId: 'dawn',
  availableThemes: [],
  isLoading: false,
  isInitialized: false,
  error: null,
};

export const useThemeStore = create<ThemeState>((set) => ({
  ...initialState,

  setActiveTheme: (themeId) =>
    set({ activeThemeId: themeId }),

  setAvailableThemes: (themes) =>
    set({ availableThemes: themes }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setInitialized: (isInitialized) =>
    set({ isInitialized }),

  setError: (error) =>
    set({ error }),

  reset: () =>
    set(initialState),
}));
