/**
 * Shared FilterSelect — consistent filter dropdown for list pages.
 * Supports optional localStorage persistence via persistKey.
 */
import { useEffect } from 'react';
import { setPersistedDefault, getPersistedDefault } from '@/lib/persistedDefaults';

interface FilterSelectProps {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  /** If set, the last selection is persisted to localStorage under this key. */
  persistKey?: string;
  /** Parameter name for persistence (defaults to the label in lowercase). */
  persistParam?: string;
}

export default function FilterSelect({
  label,
  value,
  options,
  onChange,
  persistKey,
  persistParam,
}: FilterSelectProps) {
  const paramName = persistParam ?? label.toLowerCase().replace(/\s+/g, '_');

  // On mount, restore persisted value if URL doesn't already have one
  useEffect(() => {
    if (persistKey && !value) {
      const saved = getPersistedDefault(persistKey, paramName);
      if (saved) onChange(saved);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (persistKey) {
      setPersistedDefault(persistKey, paramName, newValue);
    }
  };

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
