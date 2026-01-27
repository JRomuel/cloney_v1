'use client';

import { Select } from '@shopify/polaris';

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// Common web-safe fonts that work well in Shopify themes
const FONT_OPTIONS = [
  { label: 'Helvetica Neue', value: 'Helvetica Neue' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Lucida Sans', value: 'Lucida Sans' },
  { label: 'Tahoma', value: 'Tahoma' },
  { label: 'Palatino Linotype', value: 'Palatino Linotype' },
  { label: 'Garamond', value: 'Garamond' },
  { label: 'Bookman', value: 'Bookman' },
  { label: 'Impact', value: 'Impact' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS' },
];

export function FontSelector({ label, value, onChange }: FontSelectorProps) {
  // Find if current value exists in options, if not add it
  const options = FONT_OPTIONS.some((opt) => opt.value === value)
    ? FONT_OPTIONS
    : [{ label: value, value }, ...FONT_OPTIONS];

  return (
    <Select
      label={label}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
