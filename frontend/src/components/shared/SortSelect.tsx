/**
 * Shared SortSelect — consistent sort dropdown for list pages.
 * Supports optional localStorage persistence via persistKey.
 */
import { useEffect } from 'react';
import { setPersistedDefault, getPersistedDefault } from '@/lib/persistedDefaults';

const DEFAULT_SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'popular', label: 'Beliebteste' },
  { value: 'alphabetical', label: 'Alphabetisch (A-Z)' },
] as const;

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: ReadonlyArray<{ value: string; label: string }>;
  /** If set, the last selection is persisted to localStorage under this key. */
  persistKey?: string;
}

export default function SortSelect({
  value,
  onChange,
  options = DEFAULT_SORT_OPTIONS,
  persistKey,
}: SortSelectProps) {
  // On mount, restore persisted value if URL doesn't already have one
  useEffect(() => {
    if (persistKey && !value) {
      const saved = getPersistedDefault(persistKey, 'sort');
      if (saved) onChange(saved);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (persistKey) {
      setPersistedDefault(persistKey, 'sort', newValue);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-muted-foreground text-[18px]">sort</span>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label="Sortierung"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
