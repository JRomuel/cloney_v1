import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';

const AUTO_SAVE_DELAY = 2000; // 2 seconds debounce

export function useEditorPersistence() {
  const {
    sessionId,
    sessionStatus,
    isSessionLoaded,
    homepage,
    products,
    styles,
    selectedThemeId,
    isDirty,
    isSaving,
    setSaving,
    markSaved,
  } = useEditorStore();

  // Only allow saves after session is explicitly loaded from API
  // This prevents stale localStorage state from triggering saves
  const isReadOnly = !isSessionLoaded || sessionStatus === 'imported';

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);

  const saveToServer = useCallback(async () => {
    if (!sessionId || isSaving || isReadOnly) return;

    // Create a hash of current data to avoid duplicate saves
    const dataHash = JSON.stringify({ homepage, products, styles, selectedThemeId });
    if (dataHash === lastSavedDataRef.current) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/editor/session/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ homepage, products, styles, selectedThemeId }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      lastSavedDataRef.current = dataHash;
      markSaved();
      console.log('[AutoSave] Saved successfully');
    } catch (error) {
      console.error('[AutoSave] Failed to save:', error);
      setSaving(false);
    }
  }, [sessionId, homepage, products, styles, selectedThemeId, isSaving, isReadOnly, setSaving, markSaved]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!isDirty || !sessionId) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveToServer();
    }, AUTO_SAVE_DELAY);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, sessionId, saveToServer]);

  // Save on unmount if dirty (skip for read-only/imported sessions)
  useEffect(() => {
    return () => {
      if (isDirty && sessionId && !isReadOnly) {
        // Perform a synchronous save attempt on unmount
        navigator.sendBeacon?.(
          `/api/editor/session/${sessionId}`,
          JSON.stringify({ homepage, products, styles, selectedThemeId })
        );
      }
    };
  }, [isDirty, sessionId, homepage, products, styles, selectedThemeId, isReadOnly]);

  return {
    saveNow: saveToServer,
    isSaving,
    isDirty,
    isReadOnly,
  };
}
