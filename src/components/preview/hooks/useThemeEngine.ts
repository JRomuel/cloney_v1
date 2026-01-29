'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { useEditorStore } from '@/stores/editorStore';
import { getThemeRegistry, initializeDefaultTheme } from '@/lib/themes/core/ThemeRegistry';
import type { LiquidEngine } from '@/lib/themes/core/LiquidEngine';
import type { ThemeLoader } from '@/lib/themes/core/ThemeLoader';
import type { ThemeManifest } from '@/lib/themes/types/theme.types';

export interface ThemeEngineState {
  engine: LiquidEngine | null;
  loader: ThemeLoader | null;
  manifest: ThemeManifest | null;
  css: string;
  isReady: boolean;
  error: string | null;
}

export function useThemeEngine() {
  const { setActiveTheme, setLoading, setInitialized, setError, setAvailableThemes } = useThemeStore();
  const { selectedThemeId } = useEditorStore();

  const [state, setState] = useState<ThemeEngineState>({
    engine: null,
    loader: null,
    manifest: null,
    css: '',
    isReady: false,
    error: null,
  });

  const initializingRef = useRef(false);

  const initialize = useCallback(async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // Initialize the theme registry and load the selected theme
      await initializeDefaultTheme(selectedThemeId || 'dawn');

      const registry = getThemeRegistry();
      const theme = registry.getActiveTheme();

      if (!theme) {
        throw new Error('No active theme found');
      }

      // Load all CSS
      const css = await theme.loader.loadAllCSS();

      // Update available themes
      setAvailableThemes(registry.getAllThemes());

      setState({
        engine: theme.engine,
        loader: theme.loader,
        manifest: theme.manifest,
        css,
        isReady: true,
        error: null,
      });

      setInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize theme';
      console.error('Theme initialization error:', err);

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isReady: false,
      }));

      setError(errorMessage);
    } finally {
      setLoading(false);
      initializingRef.current = false;
    }
  }, [setLoading, setError, setAvailableThemes, setInitialized, selectedThemeId]);

  // Reinitialize when theme changes
  const switchTheme = useCallback(async (themeId: string) => {
    const registry = getThemeRegistry();
    const currentTheme = registry.getActiveTheme();

    // Check against registry's actual active theme to prevent duplicate switches
    if (currentTheme && currentTheme.config.id === themeId) return;

    setLoading(true);
    setError(null);

    try {
      await registry.setActiveTheme(themeId);

      const theme = registry.getActiveTheme();
      if (!theme) {
        throw new Error(`Theme ${themeId} not found`);
      }

      const css = await theme.loader.loadAllCSS();

      setState({
        engine: theme.engine,
        loader: theme.loader,
        manifest: theme.manifest,
        css,
        isReady: true,
        error: null,
      });

      // Update themeStore to reflect the active theme
      setActiveTheme(themeId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch theme';
      console.error('Theme switch error:', err);

      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setActiveTheme, setLoading, setError]);

  // Initialize on mount
  useEffect(() => {
    if (!state.isReady && !initializingRef.current) {
      initialize();
    }
  }, [initialize, state.isReady]);

  // Handle theme sync after initialization (e.g., when store hydrates with different theme)
  useEffect(() => {
    if (!state.isReady || !selectedThemeId) return;

    const registry = getThemeRegistry();
    const activeTheme = registry.getActiveTheme();

    // If the registry's active theme doesn't match selectedThemeId, switch to it
    if (activeTheme && activeTheme.config.id !== selectedThemeId) {
      switchTheme(selectedThemeId);
    }
  }, [state.isReady, selectedThemeId, switchTheme]);

  // Clear cache
  const clearCache = useCallback(() => {
    if (state.engine) {
      state.engine.clearCache();
    }
  }, [state.engine]);

  return {
    ...state,
    initialize,
    switchTheme,
    clearCache,
  };
}
