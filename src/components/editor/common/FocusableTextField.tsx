'use client';

import { TextField, TextFieldProps } from '@shopify/polaris';
import { useEditorStore } from '@/stores/editorStore';
import { FocusTarget } from '@/types/editor';
import { useCallback } from 'react';

interface FocusableTextFieldProps extends Omit<TextFieldProps, 'onFocus' | 'onBlur'> {
  focusTarget: FocusTarget;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * TextField wrapper that tracks focus state for preview highlighting.
 * When focused, sets the focus target in the editor store.
 * The ThemePreviewFrame subscribes to this and highlights the corresponding element.
 */
export function FocusableTextField({
  focusTarget,
  onFocus,
  onBlur,
  ...props
}: FocusableTextFieldProps) {
  const setFocusTarget = useEditorStore((state) => state.setFocusTarget);

  const handleFocus = useCallback(() => {
    setFocusTarget(focusTarget);
    onFocus?.();
  }, [focusTarget, setFocusTarget, onFocus]);

  const handleBlur = useCallback(() => {
    setFocusTarget(null);
    onBlur?.();
  }, [setFocusTarget, onBlur]);

  return (
    <TextField
      {...props}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
