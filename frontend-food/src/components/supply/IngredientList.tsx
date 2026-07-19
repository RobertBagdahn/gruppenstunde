/**
 * IngredientList — Displays recipe ingredients (RecipeItems) with quantities,
 * intelligent unit conversion, and natural portion display.
 *
 * Used on RecipeDetailPage and other recipe views.
 */
import { useState, useMemo } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RecipeItem } from '@/schemas/recipe';
import type { AvailableConversionBatchItem } from '@/schemas/supply';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';
import { formatQuantity } from '@/lib/unitConversion';
import { calculateNaturalPortions } from '@/lib/portionDisplay';
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

const GRAM_UNIT_NAMES = new Set(['Gramm', 'kg', 'Kilogramm']);

function isGramPortion(portionName?: string | null, unitName?: string | null): boolean {
  return GRAM_UNIT_NAMES.has(unitName ?? '') || /^(?:\d+(?:[.,]\d+)?\s*)?(?:g|kg)\b/i.test(portionName ?? '');
}

function formatPortionAmount(amount: number, portionName: string): string {
  const match = portionName.match(/^(\d+(?:[.,]\d+)?)\s+(.*)$/);
  const count = match ? amount * parseFloat(match[1].replace(',', '.')) : amount;
  const name = match ? match[2] : portionName;

  return `${count.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ${name}`;
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

  // Build exchange-group lookup: group_id → sorted members (position ASC)
  const exchangeGroups = useMemo(() => {
    const groups = new Map<number, RecipeItem[]>();
    for (const item of items) {
      if (item.exchange_group_id != null) {
        const existing = groups.get(item.exchange_group_id) ?? [];
        groups.set(item.exchange_group_id, [...existing, item]);
      }
    }
    // Sort members by exchange_position ascending
    for (const [id, members] of groups) {
      groups.set(id, members.sort((a, b) => (a.exchange_position ?? 0) - (b.exchange_position ?? 0)));
    }
    return groups;
  }, [items]);

  // Only show position-0 (default) members in the main list; alternatives shown inline.
  const baseItems = useMemo(() => {
    return [...items].filter((item) => {
      if (item.exchange_group_id == null) return true;
      return (item.exchange_position ?? 0) === 0;
    }).sort((a, b) => b.weight_g - a.weight_g);
  }, [items]);

  const sortedItems = baseItems;

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

  // Total recipe weight for proportional warning calculation (2.1)
  const totalWeightG = items.reduce((s, i) => s + i.weight_g * portionsMultiplier, 0);

  if (items.length === 0) {
    return (
      <div className={className}>
        <p className="text-muted-foreground italic">Keine Zutaten angegeben</p>
      </div>
    );
  }

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

  return (
    <div className={className}>
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

      {/* Ingredient list */}
      <ul className="divide-y divide-border rounded-xl border bg-card overflow-hidden">
        {filteredItems.length === 0 ? (
          <li className="px-4 py-6 text-center text-muted-foreground text-sm">
            Keine Zutaten gefunden
          </li>
        ) : (
          filteredItems.map((item) => {
          // Calculate weight in grams from pre-calculated backend weight
          const weightG = item.weight_g * portionsMultiplier;

          // Always show grams/ml as primary display
          const formatted = formatQuantity(weightG, item.ingredient_viscosity, item.ingredient_density);

          const isExpanded = expandedItems.has(item.id);
          const displayPortions = item.ingredient_portions?.filter(
            (p) => !isGramPortion(p.name, p.measuring_unit_name),
          ) ?? [];
          const allPortions = displayPortions.length
            ? calculateNaturalPortions(weightG, displayPortions)
            : [];

          // Lowest-rank non-gram portion (e.g. "Wrap", "Stück", "EL", "TL").
          // rank ASC is the sole ranking criterion (rank=1 = Normalportion).
          const highPrioPortion = displayPortions
            .filter((p) => (p.weight_g ?? 0) > 0)
            .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))[0];
          const highPrioAmount = highPrioPortion?.weight_g
            ? weightG / highPrioPortion.weight_g
            : null;
          // Show portion subline using the natural portion name, not its gram base unit.
          // Hide if less than 0.5 of a unit (not useful info).
          const rawUnitName = highPrioPortion?.name;
          const highPrioUnitName = rawUnitName ? (UNIT_SHORT[rawUnitName] ?? rawUnitName) : null;
          const highPrioDisplay = highPrioAmount && highPrioAmount >= 0.5 && highPrioUnitName
            ? formatPortionAmount(highPrioAmount, highPrioUnitName)
            : null;

          // When the portion subline uses a non-gram unit (e.g. Stück, Wrap, EL),
          // additionally show the gram weight per unit so the quantity stays comparable.
          // gramDisplay is only useful when the portion name is a non-numeric
          // unit (e.g. "Tasse", "EL"). For numeric unit portions (e.g. "100 ml",
          // "200g"), gramDisplay would just repeat the same unit → skip it.
          const portionIsNumericUnit = /^\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b/i.test(highPrioPortion?.name ?? '');
          const isGramUnit = GRAM_UNIT_NAMES.has(highPrioUnitName ?? '') || portionIsNumericUnit;
          const gramDisplay = highPrioDisplay && !isGramUnit && highPrioPortion?.weight_g
            ? formatQuantity(highPrioPortion.weight_g, item.ingredient_viscosity, item.ingredient_density).display
            : null;

          // Fallback for ingredients without a non-gram portion:
          // show the highest-priority non-gram portion as secondary info line.
          // Gram-based portions are excluded — they'd just repeat the main display.
          const allPortionsSorted = (item.ingredient_portions ?? [])
            .filter((p) => (p.weight_g ?? 0) > 0)
            .filter((p) => !isGramPortion(p.name, p.measuring_unit_name))
            .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
          const hasNonGramPrimary = highPrioDisplay !== null;
          const fallbackPortion = !hasNonGramPrimary
            ? allPortionsSorted[0]
            : null;
          const fallbackAmount = fallbackPortion?.weight_g
            ? weightG / fallbackPortion.weight_g
            : null;
          const fallbackUnitName = fallbackPortion?.name
            ? (UNIT_SHORT[fallbackPortion.name] ?? fallbackPortion.name)
            : null;
          const fallbackDisplay = fallbackAmount && fallbackAmount >= 0.5 && fallbackUnitName
            ? formatPortionAmount(fallbackAmount, fallbackUnitName)
            : null;

          // Price calculation: price_per_kg × weightG / 1000
          const pricePerKg = item.ingredient_price_per_kg;
          const priceEur = pricePerKg != null ? (pricePerKg * weightG) / 1000 : null;
          const priceDisplay = priceEur != null
            ? priceEur < 0.01 ? '< 0,01 €' : `${priceEur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
            : null;

          // Find available conversions for this ingredient
          const itemConversions = item.ingredient_id && availableConversions
            ? availableConversions.find(
                (ac) => ac.ingredient_id === item.ingredient_id,
              )?.conversions ?? []
            : [];

          // Mengen-Ampel: warn if ingredient makes up > 70% of total weight (2.2, 2.3)
          const showWeightWarning = totalWeightG > 0 && weightG / totalWeightG > 0.7;

          const ingredientContent = (
            <div className="flex flex-1 min-w-0 items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-x-2 gap-y-0.5 flex-wrap">
                  <UnitSwitcher
                    originalDisplay={formatted.display}
                    conversions={itemConversions}
                    weightG={weightG}
                  />
                  {item.ingredient_slug ? (
                    <Link
                      to={`/ingredients/${item.ingredient_slug}`}
                      className="font-medium text-foreground text-base hover:text-primary hover:underline transition-colors"
                      title={`${item.ingredient_name} – Details anzeigen`}
                    >
                      {item.ingredient_name || item.note || 'Zutat'}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground text-base">
                      {item.ingredient_name || item.note || 'Zutat'}
                    </span>
                  )}
                  {/* Task 10.1: Exchange alternatives in brackets */}
                  {item.exchange_group_id != null && (() => {
                    const alts = (exchangeGroups.get(item.exchange_group_id) ?? []).filter(
                      (m) => (m.exchange_position ?? 0) > 0,
                    );
                    if (alts.length === 0) return null;
                    return (
                      <span className="text-sm text-muted-foreground shrink-0">
                        (oder: {alts.map((m) => m.ingredient_name).join(' / ')})
                      </span>
                    );
                  })()}
                  {/* Task 10.2: Optional badge */}
                  {item.is_optional && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                      optional
                    </span>
                  )}
                  {item.ingredient_retail_section_name && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {item.ingredient_retail_section_name}
                    </span>
                  )}
                  {showWeightWarning && (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-sm font-medium shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Dominiert das Rezept</span>
                    </span>
                  )}
                  {item.has_missing_weight && (
                    <span className="inline-flex items-center gap-1 text-orange-500 text-xs font-medium shrink-0">
                      <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>Gewicht unbekannt</span>
                    </span>
                  )}
                  {item.note && (
                    <span className="text-sm text-muted-foreground italic">
                      ({item.note})
                    </span>
                  )}
                </div>

                {/* Secondary: highest-priority portion + gram weight */}
                {(highPrioDisplay || gramDisplay || fallbackDisplay) && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    {highPrioDisplay && <span>{highPrioDisplay}</span>}
                    {highPrioDisplay && gramDisplay && (
                      <span className="font-medium text-muted-foreground/60 text-xs">×</span>
                    )}
                    {gramDisplay && <span>{gramDisplay}</span>}
                    {fallbackDisplay && <span>{fallbackDisplay}</span>}
                  </div>
                )}

                {/* Expanded: all portions */}
                {allPortions.length > 1 && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleExpanded(item.id);
                      }}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                      {isExpanded ? 'weniger anzeigen' : `${allPortions.length - 1} weitere Portionen`}
                    </button>
                  </div>
                )}
                {isExpanded && allPortions.length > 1 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {allPortions.map((np, idx) => (
                      <span
                        key={idx}
                        className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {np.display}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Nutri-Score & Price: right-aligned, vertically centered */}
              <div className="flex items-center gap-2.5 shrink-0 self-center">
                {item.ingredient_nutri_class != null && (
                  (() => {
                    const nutriColors = NUTRI_SCORE_COLORS[item.ingredient_nutri_class];
                    return nutriColors ? (
                      <span
                        className={`${nutriColors.bg} ${nutriColors.text} text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0`}
                        title={`Nutri-Score: ${nutriColors.label}`}
                      >
                        {nutriColors.label}
                      </span>
                    ) : null;
                  })()
                )}
                {priceDisplay && (
                  <span className="text-sm font-medium text-muted-foreground tabular-nums">
                    {priceDisplay}
                  </span>
                )}
              </div>
            </div>
          );

          return (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              {ingredientContent}
            </li>
          );
        }))}
      </ul>
    </div>
  );
}
