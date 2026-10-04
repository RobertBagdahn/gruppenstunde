/**
 * IngredientList — Displays recipe ingredients (RecipeItems) with quantities,
 * intelligent unit conversion, and natural portion display.
 *
 * Used on RecipeDetailPage and other recipe views.
 */
import { useState, useMemo, type ReactNode } from 'react';
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';
import { AlertTriangle, ChefHat, ChevronDown, Coins, Scale, Search, Tag, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { RecipeItem } from '@/schemas/recipe';
import type { AvailableConversionBatchItem, Portion } from '@/schemas/supply';
import { formatQuantity } from '@/lib/unitConversion';
import { calculateNaturalPortions } from '@/lib/portionDisplay';
import { formatPortionAmount, isGramPortion, shortUnit } from '@/lib/ingredientAmount';
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

function formatPrice(priceEur: number): string {
  if (priceEur < 0.01) return '< 0,01 €';
  return `${priceEur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function formatShare(part: number, total: number): string {
  const percent = (part / total) * 100;
  return percent > 0 && percent < 1 ? '< 1 %' : `${Math.round(percent)} %`;
}

function PortionPill({
  title,
  amount,
  perUnit,
  tone,
}: {
  title: string;
  amount: string;
  perUnit: string | null;
  tone: 'selected' | 'approx';
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-0.5 text-body text-foreground',
        tone === 'selected' ? 'border-border bg-secondary' : 'border-border bg-background',
      )}
    >
      {tone === 'selected' ? (
        <ChefHat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : (
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">≈</span>
      )}
      <span className="sr-only">{title}:</span>
      <span className="min-w-0 break-words font-medium">{amount}</span>
      {perUnit && <span className="shrink-0 text-caption text-muted-foreground">à {perUnit}</span>}
    </span>
  );
}

function Fact({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1 tabular-nums', className)}>
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
      {children}
    </span>
  );
}

function NutriBadge({ nutriClass, className }: { nutriClass: number | null | undefined; className?: string }) {
  return <NutriScoreBadge value={nutriClass} size="sm" className={className} />;
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
  // Simple first (food-progressive-disclosure): facts per row only with "Details" or per tapped row.
  const showDetails = searchParams.get('ingredient_view') === 'details';
  const [detailRows, setDetailRows] = useState<Set<number>>(new Set());

  const setShowDetails = (value: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('ingredient_view', 'details');
    } else {
      next.delete('ingredient_view');
    }
    setSearchParams(next, { replace: true });
  };

  const toggleRowDetails = (id: number) => {
    setDetailRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
  const sortedPrices = sortedItems.map((item) => itemPrice(item) ?? 0).sort((a, b) => b - a);
  const maxPriceEur = sortedPrices[0] ?? 0;
  const secondPriceEur = sortedPrices[1] ?? 0;
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

    // Selected portion: the portion chosen for this recipe item. Metric selections (g/ml,
    // "100g Reis") are skipped — they would only repeat the amount column.
    const selectedPortion = portionsList.find((p) => p.id === item.portion_id) ?? null;
    const selectedName = selectedPortion?.name ?? item.portion_name ?? null;
    const selectedAmount = item.quantity * portionsMultiplier;
    const selectedIsMetric = isGramPortion(selectedName, selectedPortion?.measuring_unit_name ?? item.measuring_unit_name);
    const selectedDisplay = selectedName && !selectedIsMetric && selectedAmount > 0
      ? formatPortionAmount(selectedAmount, shortUnit(selectedName))
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
      && (primaryPortion.id !== selectedPortion?.id || !selectedDisplay)
      && primaryAmount != null
      && primaryAmount >= 0.05
      ? formatPortionAmount(primaryAmount, shortUnit(primaryPortion.name))
      : null;
    const primaryPerUnit = primaryDisplay && primaryPortion?.weight_g
      ? formatQuantity(primaryPortion.weight_g, item.ingredient_viscosity, item.ingredient_density).display
      : null;

    const isExpanded = expandedItems.has(item.id);
    // Further portions exclude the ones already shown in the portion row.
    const shownPortionIds = new Set([selectedDisplay ? selectedPortion?.id : null, primaryDisplay ? primaryPortion?.id : null]);
    const furtherPortions = calculateNaturalPortions(
      weightG,
      displayPortions.filter((p) => !shownPortionIds.has(p.id)),
    );

    const priceEur = itemPrice(item);
    const showShares = sortedItems.length > 1;
    const priceShare = showShares && priceEur != null && totalPriceEur > 0 ? formatShare(priceEur, totalPriceEur) : null;
    const weightShare = showShares && totalWeightG > 0 ? formatShare(weightG, totalWeightG) : null;
    // Cost driver only when one ingredient is clearly the most expensive: at least twice the runner-up
    // and more than half of the total cost.
    const isCostDriver = showShares && priceEur != null && priceEur > 0 && priceEur === maxPriceEur
      && priceEur >= 2 * secondPriceEur && priceEur / totalPriceEur > 0.5;

    const itemConversions = item.ingredient_id && availableConversions
      ? availableConversions.find((ac) => ac.ingredient_id === item.ingredient_id)?.conversions ?? []
      : [];

    // Mengen-Ampel: warn if ingredient makes up > 70% of total weight
    const showWeightWarning = totalWeightG > 0 && weightG / totalWeightG > 0.7;

    const alternatives = item.exchange_group_id != null
      ? (exchangeGroups.get(item.exchange_group_id) ?? []).filter((m) => (m.exchange_position ?? 0) > 0)
      : [];
    const displayName = item.ingredient_name || item.note || 'Zutat';
    const note = item.note && item.note !== displayName
      ? item.note.trim().replace(/^\((.*)\)$/, '$1').trim()
      : null;
    const showSection = Boolean(item.ingredient_retail_section_name) && sortMode === 'amount';

    const pricePerKg = item.ingredient_price_per_kg;
    const hasBadges = item.is_optional || item.has_missing_weight || showWeightWarning || isCostDriver;
    const hasFactsRow = showSection || weightShare != null || pricePerKg != null || priceShare != null
      || furtherPortions.length > 0;

    return (
      // Row layout: 1) amount · name · score/price, 2) portions, 3) facts and badges.
      // Rows 2 and 3 start in the name column; the subgrid keeps columns aligned across the list.
      <li
        key={item.id}
        onClick={(event) => {
          // Tapping a row reveals its facts; links, buttons and inputs keep their own behaviour.
          if ((event.target as HTMLElement).closest('a, button, input, select, [role="button"]')) return;
          if (hasFactsRow && !showDetails) toggleRowDetails(item.id);
        }}
        className={cn(
          'col-span-3 grid grid-cols-subgrid gap-y-1.5 px-6 py-3 transition-colors hover:bg-muted/30 sm:px-4',
          hasFactsRow && !showDetails && 'cursor-pointer',
        )}
      >
        {/* Row 1 */}
        <div className="min-w-[3rem] justify-self-end whitespace-nowrap text-right leading-6 tabular-nums">
          <UnitSwitcher originalDisplay={formatted.display} conversions={itemConversions} weightG={weightG} />
        </div>
        <div className="min-w-0 break-words leading-6">
          {item.ingredient_slug ? (
            <Link
              to={`/ingredients/${item.ingredient_slug}`}
              className="font-semibold text-foreground text-emphasis hyphens-auto hover:text-primary hover:underline transition-colors"
              title={`${displayName} – Details anzeigen`}
            >
              {displayName}
            </Link>
          ) : (
            <span className="font-semibold text-foreground text-emphasis hyphens-auto">{displayName}</span>
          )}
          {alternatives.length > 0 && (
            <span className="ml-1.5 text-body text-muted-foreground">
              oder {alternatives.map((m) => m.ingredient_name).join(' / ')}
            </span>
          )}
          {note && <span className="ml-1.5 inline-block text-body text-muted-foreground italic">({note})</span>}
          <NutriBadge
            nutriClass={item.ingredient_nutri_class}
            className="ml-1.5 inline-flex -translate-y-px align-middle sm:hidden"
          />
        </div>
        <div className="flex items-center justify-end gap-2.5 self-start leading-6">
          <span className="hidden w-5 justify-center sm:flex">
            <NutriBadge nutriClass={item.ingredient_nutri_class} className="flex" />
          </span>
          <span
            className={cn(
              'whitespace-nowrap text-right text-body font-semibold tabular-nums',
              priceEur != null ? 'text-foreground' : 'text-muted-foreground/60',
            )}
          >
            {priceEur != null ? formatPrice(priceEur) : '–'}
          </span>
        </div>

        {/* Row 2: portions on the left, status badges in a fixed slot on the right */}
        {(selectedDisplay || primaryDisplay || hasBadges) && (
          <div className="col-span-2 col-start-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {selectedDisplay && (
                <PortionPill title="Im Rezept" amount={selectedDisplay} perUnit={selectedPerUnit} tone="selected" />
              )}
              {primaryDisplay && (
                <PortionPill title="Entspricht ungefähr" amount={primaryDisplay} perUnit={primaryPerUnit} tone="approx" />
              )}
            </div>
            {hasBadges && (
              <div className="flex flex-wrap items-center justify-end gap-1.5 text-caption">
                {item.is_optional && (
                  <span className="rounded-full border border-dashed border-border px-2 font-medium leading-5 text-muted-foreground">
                    optional
                  </span>
                )}
                {item.has_missing_weight && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-danger-border bg-danger-soft px-2 font-medium leading-5 text-danger">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Gewicht unbekannt
                  </span>
                )}
                {showWeightWarning && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-soft px-2 font-medium leading-5 text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Dominiert das Rezept
                  </span>
                )}
                {isCostDriver && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-soft px-2 font-medium leading-5 text-warning">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />Kostentreiber
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Row 3: facts in fixed slots — category, share of amount, price per kg, share of cost */}
        {hasFactsRow && (showDetails || detailRows.has(item.id)) && (
          <div className="col-span-2 col-start-2 grid grid-cols-2 gap-x-3 gap-y-1 text-caption text-muted-foreground sm:grid-cols-[minmax(0,1fr)_6.5rem_7rem_6.5rem]">
            <span className="col-span-2 min-w-0 sm:col-span-1">
              {showSection && <Fact icon={Tag}><span className="truncate">{item.ingredient_retail_section_name}</span></Fact>}
            </span>
            <span>{weightShare && <Fact icon={Scale}>{weightShare} Menge</Fact>}</span>
            <span>{pricePerKg != null && <Fact icon={Coins}>{formatPrice(pricePerKg)}/kg</Fact>}</span>
            <span>{priceShare && <Fact icon={TrendingUp}>{priceShare} Kosten</Fact>}</span>
            {furtherPortions.length > 0 && (
              <button
                type="button"
                onClick={() => toggleExpanded(item.id)}
                className="col-span-2 inline-flex items-center gap-0.5 justify-self-start font-medium text-foreground underline-offset-2 hover:underline sm:col-span-4"
                aria-expanded={isExpanded}
              >
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')}
                  aria-hidden="true"
                />
                {isExpanded ? 'Weniger' : `Weitere Portionen (${furtherPortions.length})`}
              </button>
            )}
          </div>
        )}
        {isExpanded && furtherPortions.length > 0 && (
          <div className="col-span-2 col-start-2 flex flex-wrap gap-1.5">
            {furtherPortions.map((np) => (
              <span key={np.name} className="inline-flex rounded-lg bg-muted px-2 py-0.5 text-caption text-foreground/80">
                {np.display}
              </span>
            ))}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {showSearch && (
          <div className="relative min-w-[12rem] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zutat suchen..."
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-caption text-muted-foreground">
          <input
            type="checkbox"
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Details
        </label>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-caption text-muted-foreground">Sortieren nach</span>
          <div role="radiogroup" aria-label="Zutaten sortieren" className="inline-flex rounded-lg border bg-muted p-0.5">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={sortMode === option.value}
                onClick={() => setSortMode(option.value)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-caption font-medium transition-colors',
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
      </div>

      {/* On phones the list bleeds to the edges of the surrounding section card (p-6) to gain width. */}
      <div className="-mx-6 overflow-hidden border-y bg-card sm:mx-0 sm:rounded-xl sm:border">
        {filteredItems.length === 0 ? (
          <p className="px-4 py-6 text-center text-muted-foreground text-body">Keine Zutaten gefunden</p>
        ) : (
          // One shared grid: amount and price columns size to the widest entry of the whole list.
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 sm:gap-x-4">
            {groups.map((group) => (
              <section key={group.name ?? 'all'} className="col-span-3 grid grid-cols-subgrid border-b last:border-b-0">
                {group.name && (
                  <h3 className="col-span-3 flex items-baseline gap-1.5 border-b bg-muted/60 px-6 py-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground sm:px-4">
                    {group.name}
                    <span className="font-normal normal-case tracking-normal">({group.items.length})</span>
                  </h3>
                )}
                <ul className="col-span-3 grid grid-cols-subgrid divide-y divide-border">
                  {group.items.map(renderItem)}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t bg-muted/40 px-6 py-2.5 text-body sm:px-4">
          <span className="text-muted-foreground">
            {`${sortedItems.length} ${sortedItems.length === 1 ? 'Zutat' : 'Zutaten'} · ${formatQuantity(totalWeightG, null, null).display}`}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {totalPriceEur > 0 ? `Gesamt ${formatPrice(totalPriceEur)}` : '–'}
            {unpricedCount > 0 && (
              <span className="ml-1.5 text-caption font-normal text-muted-foreground">({unpricedCount} ohne Preis)</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
