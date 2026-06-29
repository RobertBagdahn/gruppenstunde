/**
 * Autocomplete component for ingredient selection with ghost-text preview.
 * Supports retail section filter pills, fallback search without filter,
 * and displays nutritional info (protein, fat, carbs) in results.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useRetailSections } from '@/api/supplies';
import { UnknownIngredientDialog } from './UnknownIngredientDialog';

const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

function formatNum(v: number | null | undefined): string {
  return v != null ? parseFloat(v.toFixed(1)) + 'g' : '';
}

interface IngredientSuggestion {
  id: number;
  name: string;
  slug: string;
  retail_section_name?: string;
  energy_kcal?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbohydrate_g?: number | null;
  nutri_class?: number | null;
  price_per_kg?: number | null;
}

const IngredientListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  energy_kcal: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  carbohydrate_g: z.number().nullable().optional(),
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
  const [selectedRetailSection, setSelectedRetailSection] = useState<number | null>(null);
  const [hasFallenBack, setHasFallenBack] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: retailSections = [] } = useRetailSections();

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  // Reset fallback flag when filters change
  useEffect(() => {
    setHasFallenBack(false);
  }, [debouncedQuery, selectedRetailSection]);

  // Primary search (with optional retail_section filter)
  const primaryFilter = selectedRetailSection ?? undefined;
  const { data: primaryResults = [] } = useQuery({
    queryKey: ['ingredient-autocomplete', debouncedQuery, primaryFilter] as const,
    queryFn: async (): Promise<IngredientSuggestion[]> => {
      const params = new URLSearchParams();
      params.set('name', debouncedQuery);
      params.set('page_size', '8');
      if (primaryFilter) params.set('retail_section', String(primaryFilter));
      const res = await fetch(`/api/ingredients/?${params}`, { credentials: 'include' });
      if (!res.ok) return [];
      const json = await res.json();
      const items = z.array(IngredientListItemSchema).parse(json.items ?? []);
      return items.map((i) => ({
        id: i.id,
        name: i.name,
        slug: i.slug,
        retail_section_name: i.retail_section?.name ?? undefined,
        energy_kcal: i.energy_kcal ?? undefined,
        protein_g: i.protein_g ?? undefined,
        fat_g: i.fat_g ?? undefined,
        carbohydrate_g: i.carbohydrate_g ?? undefined,
        nutri_class: i.nutri_class ?? undefined,
        price_per_kg: i.price_per_kg ?? undefined,
      }));
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  // Fallback: retry without filter if primary returns no results and a filter is active
  const primaryEmpty = primaryResults.length === 0;
  const { data: fallbackResults = [] } = useQuery({
    queryKey: ['ingredient-autocomplete-fallback', debouncedQuery] as const,
    queryFn: async (): Promise<IngredientSuggestion[]> => {
      const params = new URLSearchParams();
      params.set('name', debouncedQuery);
      params.set('page_size', '8');
      const res = await fetch(`/api/ingredients/?${params}`, { credentials: 'include' });
      if (!res.ok) return [];
      const json = await res.json();
      const items = z.array(IngredientListItemSchema).parse(json.items ?? []);
      return items.map((i) => ({
        id: i.id,
        name: i.name,
        slug: i.slug,
        retail_section_name: i.retail_section?.name ?? undefined,
        energy_kcal: i.energy_kcal ?? undefined,
        protein_g: i.protein_g ?? undefined,
        fat_g: i.fat_g ?? undefined,
        carbohydrate_g: i.carbohydrate_g ?? undefined,
        nutri_class: i.nutri_class ?? undefined,
        price_per_kg: i.price_per_kg ?? undefined,
      }));
    },
    enabled: debouncedQuery.length >= 2 && primaryEmpty && selectedRetailSection != null,
    staleTime: 30_000,
  });

  const suggestions = primaryEmpty && hasFallenBack && selectedRetailSection != null
    ? fallbackResults
    : primaryResults;

  // Track fallback state
  useEffect(() => {
    if (primaryEmpty && selectedRetailSection != null && debouncedQuery.length >= 2) {
      setHasFallenBack(true);
    }
  }, [primaryEmpty, selectedRetailSection, debouncedQuery]);

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

      {/* Filter pills */}
      {isOpen && retailSections.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5">
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setSelectedRetailSection(null)}
              className={cn(
                'shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border',
                selectedRetailSection === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted',
              )}
            >
              Alle
            </button>
            {retailSections.map((rs) => (
              <button
                key={rs.id}
                onClick={() => setSelectedRetailSection(rs.id)}
                className={cn(
                  'shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border',
                  selectedRetailSection === rs.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted',
                )}
              >
                {rs.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
          role="listbox"
        >
          {hasFallenBack && selectedRetailSection != null && (
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b bg-muted/30">
              Keine Treffer in dieser Abteilung — zeige alle Ergebnisse
            </div>
          )}
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
                {/* Nutritional info */}
                {(s.protein_g != null || s.fat_g != null || s.carbohydrate_g != null) && (
                  <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground border-l pl-2">
                    {s.protein_g != null && <span>E {formatNum(s.protein_g)}</span>}
                    {s.fat_g != null && <span>F {formatNum(s.fat_g)}</span>}
                    {s.carbohydrate_g != null && <span>KH {formatNum(s.carbohydrate_g)}</span>}
                  </div>
                )}
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
