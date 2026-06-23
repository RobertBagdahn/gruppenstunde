/**
 * Autocomplete component for ingredient selection with ghost-text preview.
 * Uses existing GET /api/ingredients/?name= endpoint with debounce.
 * Includes keyboard navigation and integration with UnknownIngredientDialog.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { UnknownIngredientDialog } from './UnknownIngredientDialog';

const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

interface IngredientSuggestion {
  id: number;
  name: string;
  slug: string;
  retail_section_name?: string;
  energy_kcal?: number | null;
  nutri_class?: number | null;
  price_per_kg?: number | null;
}

const IngredientListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  energy_kcal: z.number().nullable().optional(),
  nutri_class: z.number().nullable().optional(),
  price_per_kg: z.number().nullable().optional(),
  retail_section: z.object({ name: z.string() }).nullable().optional(),
});

interface IngredientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (ingredient: { id: number; name: string; slug: string }) => void;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function IngredientAutocomplete({
  value,
  onChange,
  onSelect,
  onCreateNew,
  placeholder = 'Zutat suchen...',
  className,
  autoFocus = false,
}: IngredientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showUnknownDialog, setShowUnknownDialog] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['ingredient-autocomplete', debouncedQuery] as const,
    queryFn: async (): Promise<IngredientSuggestion[]> => {
      const res = await fetch(
        `/api/ingredients/?name=${encodeURIComponent(debouncedQuery)}&page_size=8`,
        { credentials: 'include' }
      );
      if (!res.ok) return [];
      const json = await res.json();
      const items = z.array(IngredientListItemSchema).parse(json.items ?? []);
      return items.map((i) => ({
        id: i.id,
        name: i.name,
        slug: i.slug,
        retail_section_name: i.retail_section?.name ?? undefined,
        energy_kcal: i.energy_kcal ?? undefined,
        nutri_class: i.nutri_class ?? undefined,
        price_per_kg: i.price_per_kg ?? undefined,
      }));
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  // Ghost text: first suggestion that starts with the current input
  const ghostText =
    suggestions.length > 0 && value.length >= 2
      ? suggestions.find((s) =>
          s.name.toLowerCase().startsWith(value.toLowerCase())
        )?.name ?? ''
      : '';

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen && suggestions.length > 0 && e.key !== 'Escape') {
        setIsOpen(true);
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, -1));
          break;
        case 'Tab':
          if (ghostText && activeIndex === -1) {
            e.preventDefault();
            onChange(ghostText);
            const match = suggestions.find(
              (s) => s.name.toLowerCase() === ghostText.toLowerCase()
            );
            if (match) {
              onSelect(match);
              setIsOpen(false);
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && suggestions[activeIndex]) {
            onSelect(suggestions[activeIndex]);
            onChange(suggestions[activeIndex].name);
            setIsOpen(false);
          } else if (value.length >= 2 && suggestions.length === 0) {
            setShowUnknownDialog(true);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, activeIndex, ghostText, value, onChange, onSelect]
  );

  return (
    <div className={cn('relative', className)}>
      {/* Ghost text layer */}
      <div className="pointer-events-none absolute inset-0 flex items-center px-3">
        <Plus className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
        <span className="invisible">{value}</span>
        <span className="text-muted-foreground/40">
          {ghostText.slice(value.length)}
        </span>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => value.length >= 2 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
      />

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
          role="listbox"
        >
          {suggestions.map((s, i) => {
            const nutriLabel =
              s.nutri_class != null
                ? (['A', 'B', 'C', 'D', 'E'][s.nutri_class - 1] ?? '?')
                : null;
            const nutriColors = nutriLabel
              ? NUTRI_SCORE_COLORS[nutriLabel]
              : null;
            return (
              <button
                key={s.id}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors',
                  i === activeIndex && 'bg-accent'
                )}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(s);
                  onChange(s.name);
                  setIsOpen(false);
                }}
              >
                {nutriLabel && nutriColors ? (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0',
                      nutriColors.bg,
                      nutriColors.text
                    )}
                  >
                    {nutriLabel}
                  </span>
                ) : (
                  <span className="w-5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">
                    {s.name}
                  </span>
                  {s.retail_section_name && (
                    <span className="text-[11px] text-muted-foreground truncate block">
                      {s.retail_section_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                  {s.energy_kcal != null && (
                    <span>{Math.round(s.energy_kcal)} kcal</span>
                  )}
                  {s.price_per_kg != null && (
                    <span className="text-foreground font-medium">
                      {s.price_per_kg.toLocaleString('de-DE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      €/kg
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Unknown ingredient dialog */}
      <UnknownIngredientDialog
        open={showUnknownDialog}
        query={value}
        onSelect={(id, name) => {
          onSelect({ id, name, slug: '' });
          onChange(name);
          setShowUnknownDialog(false);
        }}
        onCreateNew={(name) => {
          onCreateNew?.(name);
          setShowUnknownDialog(false);
        }}
        onClose={() => setShowUnknownDialog(false)}
      />
    </div>
  );
}
