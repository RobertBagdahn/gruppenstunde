/**
 * Autocomplete component for ingredient selection with ghost-text preview.
 * Supports retail section filter pills, fallback search without filter,
 * and displays nutritional info (protein, fat, carbs) in results.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE_URL, getApiErrorMessage, parseApiResponse } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRetailSections } from '@/api/supplies';
import { UnknownIngredientDialog } from './UnknownIngredientDialog';
import { NUTRI_SCORE_COLORS_BY_LETTER, PaginatedIngredientSchema } from '@/schemas/supply';
import { roundToDecimals } from '@/lib/format';

const NUTRI_SCORE_COLORS = NUTRI_SCORE_COLORS_BY_LETTER;

function formatNum(v: number | null | undefined): string {
  return v != null ? roundToDecimals(v, 1) + 'g' : '';
}

function isMobileTouchViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return window.matchMedia('(max-width: 767px)').matches
    && (window.matchMedia('(pointer: coarse)').matches || hasTouch);
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
  const {
    data: primaryResults = [],
    error: primaryError,
    isFetching: primaryFetching,
    refetch: refetchPrimary,
  } = useQuery({
    queryKey: ['ingredient-autocomplete', debouncedQuery, primaryFilter] as const,
    queryFn: async (): Promise<IngredientSuggestion[]> => {
      const params = new URLSearchParams();
      params.set('name', debouncedQuery);
      params.set('page_size', '8');
      if (primaryFilter) params.set('retail_section', String(primaryFilter));
      const res = await fetch(`${API_BASE_URL}/api/ingredients/?${params}`, { credentials: 'include' });
      const response = await parseApiResponse(res, PaginatedIngredientSchema);
      return response.items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        retail_section_name: item.retail_section_name ?? undefined,
        energy_kcal: item.energy_kcal,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
        carbohydrate_g: item.carbohydrate_g,
        nutri_class: item.nutri_class,
        price_per_kg: item.price_per_kg,
      }));
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  // Fallback: retry without filter if primary returns no results and a filter is active
  const primaryEmpty = primaryError === null && !primaryFetching && primaryResults.length === 0;
  const {
    data: fallbackResults = [],
    error: fallbackError,
    isFetching: fallbackFetching,
    refetch: refetchFallback,
  } = useQuery({
    queryKey: ['ingredient-autocomplete-fallback', debouncedQuery] as const,
    queryFn: async (): Promise<IngredientSuggestion[]> => {
      const params = new URLSearchParams();
      params.set('name', debouncedQuery);
      params.set('page_size', '8');
      const res = await fetch(`${API_BASE_URL}/api/ingredients/?${params}`, { credentials: 'include' });
      const response = await parseApiResponse(res, PaginatedIngredientSchema);
      return response.items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        retail_section_name: item.retail_section_name ?? undefined,
        energy_kcal: item.energy_kcal,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
        carbohydrate_g: item.carbohydrate_g,
        nutri_class: item.nutri_class,
        price_per_kg: item.price_per_kg,
      }));
    },
    enabled: debouncedQuery.length >= 2 && primaryEmpty && selectedRetailSection != null,
    staleTime: 30_000,
  });

  const usingFallback = primaryEmpty && hasFallenBack && selectedRetailSection != null;
  const suggestions = usingFallback ? fallbackResults : primaryResults;
  const searchError = usingFallback ? fallbackError : primaryError;
  const isSearching = primaryFetching || fallbackFetching;
  const retrySearch = () => {
    void (usingFallback ? refetchFallback() : refetchPrimary());
  };

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

  const handleFocus = useCallback(() => {
    if (value.length >= 2) setIsOpen(true);
    if (!isMobileTouchViewport()) return;

    window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      const targetTop = window.scrollY + input.getBoundingClientRect().top - 16;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }, 100);
  }, [value]);

  const handleRetailSectionPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    inputRef.current?.focus();
  }, []);

  const handleRetailSectionChange = useCallback((sectionId: number | null) => {
    setSelectedRetailSection(sectionId);
    setIsOpen(true);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  return (
    <div data-testid="ingredient-autocomplete" className={cn('relative min-w-0', className)}>
      <div className="relative h-11">
        {/* Ghost text layer */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center px-3.5 overflow-hidden">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary shrink-0 mr-2.5">
            <Plus className="w-4 h-4" />
          </span>
          <span className="invisible whitespace-pre">{value}</span>
          <span className="text-muted-foreground/50 whitespace-pre truncate">
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
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="relative z-10 flex h-11 w-full rounded-lg border border-input bg-transparent pl-11 pr-3.5 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
      </div>

      {/* Filter pills */}
      {isOpen && retailSections.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2">
          <div data-testid="ingredient-category-pills" className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onPointerDown={handleRetailSectionPointerDown}
              onClick={() => handleRetailSectionChange(null)}
              className={cn(
                'shrink-0 px-3 py-1 rounded-full text-caption font-medium transition-colors border',
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
                type="button"
                onPointerDown={handleRetailSectionPointerDown}
                onClick={() => handleRetailSectionChange(rs.id)}
                className={cn(
                  'shrink-0 px-3 py-1 rounded-full text-caption font-medium transition-colors border',
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
      {isOpen && (suggestions.length > 0 || debouncedQuery.length >= 2) && (
        <div
          ref={listRef}
          className="absolute top-full z-50 mt-2 w-full max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
          role="listbox"
        >
          {searchError ? (
            <div role="alert" className="p-3 space-y-2 text-body text-danger-foreground">
              <p>{getApiErrorMessage(searchError, 'Zutaten konnten nicht geladen werden.')}</p>
              <button type="button" onClick={retrySearch} className="text-body font-semibold underline">
                Erneut versuchen
              </button>
            </div>
          ) : (
            <>
              {hasFallenBack && selectedRetailSection != null && (
                <div className="px-3.5 py-2 text-caption text-muted-foreground border-b bg-muted/30">
                  Keine Treffer in dieser Abteilung — zeige alle Ergebnisse
                </div>
              )}
              {isSearching && suggestions.length === 0 && (
                <div className="p-3 text-caption text-muted-foreground">Suche läuft…</div>
              )}
              {suggestions.map((suggestion, index) => {
                const nutriLabel = suggestion.nutri_class != null
                  ? (['A', 'B', 'C', 'D', 'E'][suggestion.nutri_class - 1] ?? '?')
                  : null;
                const nutriColors = nutriLabel ? NUTRI_SCORE_COLORS[nutriLabel] : null;
                return (
                  <button
                    key={suggestion.id}
                    className={cn(
                      'flex w-full items-center gap-3 px-3.5 py-3 text-body text-left border-l-2 border-transparent hover:bg-muted transition-colors',
                      index === activeIndex && 'bg-primary/5 border-l-primary',
                    )}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect(suggestion);
                      onChange(suggestion.name);
                      setIsOpen(false);
                    }}
                  >
                    {nutriLabel && nutriColors ? (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-6 h-6 rounded-lg text-caption font-bold shrink-0',
                          nutriColors.bg,
                          nutriColors.text,
                        )}
                      >
                        {nutriLabel}
                      </span>
                    ) : (
                      <span className="w-6 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block text-foreground">{suggestion.name}</span>
                      {suggestion.retail_section_name && (
                        <span className="text-caption text-muted-foreground truncate block">
                          {suggestion.retail_section_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-caption text-muted-foreground">
                      {suggestion.energy_kcal != null && (
                        <span>{Math.round(suggestion.energy_kcal)} kcal</span>
                      )}
                      {suggestion.price_per_kg != null && (
                        <span className="text-foreground font-medium">
                          {suggestion.price_per_kg.toLocaleString('de-DE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          €/kg
                        </span>
                      )}
                    </div>
                    {(suggestion.protein_g != null || suggestion.fat_g != null || suggestion.carbohydrate_g != null) && (
                      <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-caption text-muted-foreground border-l pl-2.5">
                        {suggestion.protein_g != null && <span>E {formatNum(suggestion.protein_g)}</span>}
                        {suggestion.fat_g != null && <span>F {formatNum(suggestion.fat_g)}</span>}
                        {suggestion.carbohydrate_g != null && <span>KH {formatNum(suggestion.carbohydrate_g)}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
              {suggestions.length > 0 && debouncedQuery.length >= 2 && (
                <div className="border-t mx-1" />
              )}
              {!isSearching && suggestions.length === 0 && debouncedQuery.length >= 2 && (
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 px-3.5 py-3 text-body text-left border-l-2 border-transparent hover:bg-muted transition-colors',
                    activeIndex === -1 && 'bg-primary/5 border-l-primary',
                  )}
                  role="option"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onCreateNew?.(debouncedQuery);
                    setIsOpen(false);
                  }}
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary shrink-0">
                    <Plus className="w-4 h-4" />
                  </span>
                  <span className="flex-1 text-primary font-medium">
                    &ldquo;{debouncedQuery}&rdquo; neu anlegen
                  </span>
                </button>
              )}
            </>
          )}
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
