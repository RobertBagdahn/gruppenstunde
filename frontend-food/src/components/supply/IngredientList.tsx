/**
 * IngredientList — Displays recipe ingredients (RecipeItems) with quantities,
 * intelligent unit conversion, and natural portion display.
 *
 * Used on RecipeDetailPage and other recipe views.
 */
import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { RecipeItem } from '@/schemas/recipe';
import type { AvailableConversionBatchItem, Portion } from '@/schemas/supply';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';
import { formatQuantity } from '@/lib/unitConversion';
import { calculateNaturalPortions } from '@/lib/portionDisplay';
import { cn } from '@/lib/utils';
import UnitSwitcher from '@/components/recipe/UnitSwitcher';

interface IngredientListProps {
  items: RecipeItem[];
  portions: number | null;
  portionsMultiplier: number;
  /** Available unit conversions per ingredient (from batch API) */
  availableConversions?: AvailableConversionBatchItem[];
  className?: string;
  showSearch?: boolean;
}

type SortMode = 'amount' | 'category';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'amount', label: 'Menge' },
  { value: 'category', label: 'Kategorie' },
];

const UNCATEGORIZED_LABEL = 'Sonstiges';

/** Short display names for measuring units */
const UNIT_SHORT: Record<string, string> = {
  'Esslöffel': 'EL',
  'Teelöffel': 'TL',
  'Kilogramm': 'kg',
  'Gramm': 'g',
  'Milliliter': 'ml',
  'Liter': 'l',
  'Prise': 'Pr.',
  'Tasse': 'Tasse',
  'Messerspitze': 'Msp.',
  'Schuss': 'Schuss',
};

const BASE_METRIC_UNIT_NAMES = new Set(['Gramm', 'g', 'kg', 'Kilogramm', 'Milliliter', 'ml', 'Liter', 'l']);

function isGramPortion(portionName?: string | null, unitName?: string | null): boolean {
  return BASE_METRIC_UNIT_NAMES.has(unitName ?? '') || /^(?:\d+(?:[.,]\d+)?\s*)?(?:g|kg|ml|l)\b/i.test(portionName ?? '');
}

function shortUnit(name: string): string {
  return UNIT_SHORT[name] ?? name;
}

function formatPrice(priceEur: number): string {
  if (priceEur < 0.01) return '< 0,01 €';
  return `${priceEur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function formatPortionAmount(amount: number, portionName: string): string {
  const match = portionName.match(/^(\d+(?:[.,]\d+)?)\s+(.*)$/);
  const count = match ? amount * parseFloat(match[1].replace(',', '.')) : amount;
  const name = match ? match[2] : portionName;

  return `${count.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ${name}`;
}

function PortionLine({ label, amount, perUnit }: { label: string; amount: string; perUnit: string | null }) {
  return (
    <div className="flex items-baseline gap-2 text-sm text-muted-foreground">
      <span className="w-14 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      <span className="text-foreground/80">{amount}</span>
      {perUnit && <span className="text-xs text-muted-foreground/80">à {perUnit}</span>}
    </div>
  );
}

export default function IngredientList({
  items,
  portions: _portions,
  portionsMultiplier,
  availableConversions,
  className = '',
  showSearch = true,
}: IngredientListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const sortMode: SortMode = searchParams.get('ingredient_sort') === 'category' ? 'category' : 'amount';

  const setSortMode = (mode: SortMode) => {
    const next = new URLSearchParams(searchParams);
    if (mode === 'amount') {
      next.delete('ingredient_sort');
    } else {
      next.set('ingredient_sort', mode);
    }
    setSearchParams(next, { replace: true });
  };

  // Build exchange-group lookup: group_id → sorted members (position ASC)
  const exchangeGroups = useMemo(() => {
    const groups = new Map<number, RecipeItem[]>();
    for (const item of items) {
      if (item.exchange_group_id != null) {
        const existing = groups.get(item.exchange_group_id) ?? [];
        groups.set(item.exchange_group_id, [...existing, item]);
      }
    }
    for (const [id, members] of groups) {
      groups.set(id, members.sort((a, b) => (a.exchange_position ?? 0) - (b.exchange_position ?? 0)));
    }
    return groups;
  }, [items]);

  // Only show position-0 (default) members in the main list; alternatives shown inline.
  const sortedItems = useMemo(() => {
    return [...items].filter((item) => {
      if (item.exchange_group_id == null) return true;
      return (item.exchange_position ?? 0) === 0;
    }).sort((a, b) => b.weight_g - a.weight_g);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sortedItems;
    const q = searchQuery.toLowerCase();
    return sortedItems.filter(
      (item) =>
        item.ingredient_name?.toLowerCase().includes(q) ||
        item.note?.toLowerCase().includes(q) ||
        item.ingredient_retail_section_name?.toLowerCase().includes(q),
    );
  }, [sortedItems, searchQuery]);

  // Category mode groups by retail section (alphabetical, "Sonstiges" last); amount mode is one group.
  const groups = useMemo(() => {
    if (sortMode === 'amount') return [{ name: null, items: filteredItems }];
    const byName = new Map<string, RecipeItem[]>();
    for (const item of filteredItems) {
      const name = item.ingredient_retail_section_name || UNCATEGORIZED_LABEL;
      byName.set(name, [...(byName.get(name) ?? []), item]);
    }
    return [...byName.entries()]
      .sort(([a], [b]) => {
        if (a === UNCATEGORIZED_LABEL) return 1;
        if (b === UNCATEGORIZED_LABEL) return -1;
        return a.localeCompare(b, 'de');
      })
      .map(([name, groupItems]) => ({ name, items: groupItems }));
  }, [filteredItems, sortMode]);

  if (items.length === 0) {
    return (
      <div className={className}>
        <p className="text-muted-foreground italic">Keine Zutaten angegeben</p>
      </div>
    );
  }

  const itemPrice = (item: RecipeItem): number | null =>
    item.ingredient_price_per_kg != null
      ? (item.ingredient_price_per_kg * item.weight_g * portionsMultiplier) / 1000
      : null;

  // Totals over the default ingredients — exchange alternatives are not added up.
  const totalWeightG = sortedItems.reduce((sum, item) => sum + item.weight_g * portionsMultiplier, 0);
  const totalPriceEur = sortedItems.reduce((sum, item) => sum + (itemPrice(item) ?? 0), 0);
  const unpricedCount = sortedItems.filter((item) => itemPrice(item) == null).length;

  const toggleExpanded = (itemId: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const renderItem = (item: RecipeItem) => {
    const weightG = item.weight_g * portionsMultiplier;
    const formatted = formatQuantity(weightG, item.ingredient_viscosity, item.ingredient_density);
    const portionsList: Portion[] = item.ingredient_portions ?? [];

    // Selected portion: the portion chosen for this recipe item.
    // Metric selections (g/ml) are skipped — they would only repeat the amount column.
    const selectedPortion = portionsList.find((p) => p.id === item.portion_id) ?? null;
    const selectedIsMetric = selectedPortion
      ? isGramPortion(selectedPortion.name, selectedPortion.measuring_unit_name)
      : true;
    const selectedAmount = item.quantity * portionsMultiplier;
    const selectedDisplay = selectedPortion && !selectedIsMetric && selectedAmount > 0
      ? formatPortionAmount(selectedAmount, shortUnit(selectedPortion.name))
      : null;
    const selectedPerUnit = selectedDisplay && selectedPortion?.weight_g
      ? formatQuantity(selectedPortion.weight_g, item.ingredient_viscosity, item.ingredient_density).display
      : null;

    // Primary portion: lowest-rank non-gram portion with a weight (rank=1 = Normalportion).
    const displayPortions = portionsList.filter((p) => !isGramPortion(p.name, p.measuring_unit_name));
    const primaryPortion = displayPortions
      .filter((p) => (p.weight_g ?? 0) > 0)
      .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))[0];
    const primaryAmount = primaryPortion?.weight_g ? weightG / primaryPortion.weight_g : null;
    const primaryDisplay = primaryPortion
      && primaryPortion.id !== selectedPortion?.id
      && primaryAmount != null
      && primaryAmount >= 0.05
      ? formatPortionAmount(primaryAmount, shortUnit(primaryPortion.name))
      : null;
    const primaryPerUnit = primaryDisplay && primaryPortion?.weight_g
      ? formatQuantity(primaryPortion.weight_g, item.ingredient_viscosity, item.ingredient_density).display
      : null;

    const isExpanded = expandedItems.has(item.id);
    const allPortions = displayPortions.length ? calculateNaturalPortions(weightG, displayPortions) : [];

    const priceEur = itemPrice(item);
    const priceShare = priceEur != null && totalPriceEur > 0 ? priceEur / totalPriceEur : null;
    const priceSharePercent = priceShare != null ? Math.round(priceShare * 100) : null;

    const itemConversions = item.ingredient_id && availableConversions
      ? availableConversions.find((ac) => ac.ingredient_id === item.ingredient_id)?.conversions ?? []
      : [];

    // Mengen-Ampel: warn if ingredient makes up > 70% of total weight
    const showWeightWarning = totalWeightG > 0 && weightG / totalWeightG > 0.7;

    const alternatives = item.exchange_group_id != null
      ? (exchangeGroups.get(item.exchange_group_id) ?? []).filter((m) => (m.exchange_position ?? 0) > 0)
      : [];
    const nutriColors = item.ingredient_nutri_class != null
      ? NUTRI_SCORE_COLORS[item.ingredient_nutri_class]
      : undefined;
    const displayName = item.ingredient_name || item.note || 'Zutat';
    const note = item.note && item.note !== displayName
      ? item.note.trim().replace(/^\((.*)\)$/, '$1').trim()
      : null;
    const showSection = Boolean(item.ingredient_retail_section_name) && sortMode === 'amount';
    const hasChips = showSection || item.is_optional || showWeightWarning || item.has_missing_weight;

    return (
      <li
        key={item.id}
        className="grid break-inside-avoid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-x-3 rounded-lg border bg-card px-3 py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:px-4"
      >
        {/* Column 1: amount (right-aligned so units line up) */}
        <div className="justify-self-end text-right leading-6 tabular-nums">
          <UnitSwitcher originalDisplay={formatted.display} conversions={itemConversions} weightG={weightG} />
        </div>

        {/* Column 2: name, portions, chips */}
        <div className="min-w-0 space-y-1">
          <div className="leading-6">
            {item.ingredient_slug ? (
              <Link
                to={`/ingredients/${item.ingredient_slug}`}
                className="font-medium text-foreground text-base hover:text-primary hover:underline transition-colors"
                title={`${displayName} – Details anzeigen`}
              >
                {displayName}
              </Link>
            ) : (
              <span className="font-medium text-foreground text-base">{displayName}</span>
            )}
            {alternatives.length > 0 && (
              <span className="ml-1.5 text-sm text-muted-foreground">
                (oder: {alternatives.map((m) => m.ingredient_name).join(' / ')})
              </span>
            )}
            {note && <span className="ml-1.5 text-sm text-muted-foreground italic">({note})</span>}
          </div>

          {selectedDisplay && <PortionLine label="Gewählt" amount={selectedDisplay} perUnit={selectedPerUnit} />}
          {primaryDisplay && <PortionLine label="Primär" amount={`≈ ${primaryDisplay}`} perUnit={primaryPerUnit} />}

          {hasChips && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {showSection && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {item.ingredient_retail_section_name}
                </span>
              )}
              {item.is_optional && (
                <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-xs text-foreground">
                  optional
                </span>
              )}
              {showWeightWarning && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                  Dominiert das Rezept
                </span>
              )}
              {item.has_missing_weight && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                  Gewicht unbekannt
                </span>
              )}
            </div>
          )}

          {allPortions.length > 1 && (
            <button
              type="button"
              onClick={() => toggleExpanded(item.id)}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
              aria-expanded={isExpanded}
            >
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')}
                aria-hidden="true"
              />
              {isExpanded ? 'Weniger anzeigen' : `Alle Portionen (${allPortions.length})`}
            </button>
          )}
          {isExpanded && allPortions.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {allPortions.map((np, idx) => (
                <span key={idx} className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {np.display}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Nutri-Score + price with share of total price, in fixed-width slots */}
        <div className="flex items-start gap-2.5 pt-0.5">
          <span className="flex w-5 justify-center">
            {nutriColors && (
              <span
                className={cn(
                  nutriColors.bg,
                  nutriColors.text,
                  'flex h-5 w-5 items-center justify-center rounded text-[11px] font-extrabold',
                )}
                title={`Nutri-Score ${nutriColors.label}`}
              >
                {nutriColors.label}
              </span>
            )}
          </span>
          <div className="w-16 space-y-1">
            <p className="text-right text-sm font-medium leading-5 tabular-nums text-muted-foreground">
              {priceEur != null ? formatPrice(priceEur) : '–'}
            </p>
            {priceShare != null && (
              <div
                className="h-1 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${priceSharePercent} % des Gesamtpreises`}
                title={`${priceSharePercent} % des Gesamtpreises`}
              >
                <div
                  className="ml-auto h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.max(priceShare * 100, 2)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Sortieren nach</span>
        <div role="radiogroup" aria-label="Zutaten sortieren" className="inline-flex rounded-lg border bg-muted p-0.5">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={sortMode === option.value}
              onClick={() => setSortMode(option.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                sortMode === option.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {showSearch && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zutat suchen..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <p className="rounded-xl border px-4 py-6 text-center text-muted-foreground text-sm">
          Keine Zutaten gefunden
        </p>
      ) : (
        // Two columns on wide screens, filled top-down so the reading order stays column-wise.
        <div className="xl:columns-2 xl:gap-4">
          {groups.map((group) => (
            <section key={group.name ?? 'all'} className="mb-2">
              {group.name && (
                <h3 className="mb-1.5 mt-1 flex items-baseline gap-1.5 break-after-avoid px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.name}
                  <span className="font-normal normal-case tracking-normal">({group.items.length})</span>
                </h3>
              )}
              <ul className="space-y-2">{group.items.map(renderItem)}</ul>
            </section>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-3 text-sm">
        <span className="text-muted-foreground">
          {`${sortedItems.length} ${sortedItems.length === 1 ? 'Zutat' : 'Zutaten'} · ${formatQuantity(totalWeightG, null, null).display}`}
        </span>
        <span className="font-semibold tabular-nums text-foreground">
          {totalPriceEur > 0 ? formatPrice(totalPriceEur) : '–'}
          {unpricedCount > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">({unpricedCount} ohne Preis)</span>
          )}
        </span>
      </div>
    </div>
  );
}
