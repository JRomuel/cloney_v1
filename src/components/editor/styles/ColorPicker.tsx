'use client';

import { useState, useCallback } from 'react';
import { TextField, InlineStack, Box, Text } from '@shopify/polaris';
import styles from './ColorPicker.module.css';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
}

export function ColorPicker({ label, value, onChange, helpText }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = useCallback(
    (newValue: string) => {
      setInputValue(newValue);
      // Validate hex color format
      if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const handleColorPickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className={styles.container}>
      <InlineStack gap="300" blockAlign="center">
        <div className={styles.colorInputWrapper}>
          <input
            type="color"
            value={value}
            onChange={handleColorPickerChange}
            className={styles.colorInput}
            aria-label={`${label} color picker`}
          />
          <div
            className={styles.colorSwatch}
            style={{ backgroundColor: value }}
          />
        </div>
        <div className={styles.textFieldWrapper}>
          <TextField
            label={label}
            value={inputValue}
            onChange={handleInputChange}
            autoComplete="off"
            helpText={helpText}
            prefix="#"
            maxLength={7}
          />
        </div>
      </InlineStack>
    </div>
  );
}
