/**
 * IngredientList — Displays recipe ingredients (RecipeItems) with quantities,
 * intelligent unit conversion, and natural portion display.
 *
 * Used on RecipeDetailPage and other recipe views.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RecipeItem } from '@/schemas/recipe';
import type { AvailableConversionBatchItem } from '@/schemas/supply';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';
import { formatQuantity } from '@/lib/unitConversion';
import { calculateNaturalPortions } from '@/lib/portionDisplay';
import { cn } from '@/lib/utils';
import UnitSwitcher from '@/components/recipe/UnitSwitcher';

interface IngredientListProps {
  items: RecipeItem[];
  servings: number | null;
  servingsMultiplier: number;
  /** Available unit conversions per ingredient (from batch API) */
  availableConversions?: AvailableConversionBatchItem[];
  className?: string;
}

/** Short display names for measuring units */
const UNIT_SHORT: Record<string, string> = {
  'Esslöffel': 'EL',
  'Teelöffel': 'TL',
  'Kilogramm': 'kg',
  'Gramm': 'g',
  'Milliliter': 'ml',
  'Liter': 'l',
  'Stück': 'St.',
  'Prise': 'Pr.',
  'Dose': 'Dose',
  'Tasse': 'Tasse',
  'Handvoll': 'Handvoll',
  'Tropfen': 'Tropfen',
  'Becher': 'Becher',
  'Portion': 'Portion',
};

const GRAM_UNIT_NAMES = new Set(['g', 'Gramm', 'kg', 'Kilogramm']);

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
  servings: _servings,
  servingsMultiplier,
  availableConversions,
  className = '',
}: IngredientListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  if (items.length === 0) {
    return (
      <div className={className}>
        <p className="text-muted-foreground italic">Keine Zutaten angegeben</p>
      </div>
    );
  }

  const sortedItems = [...items].sort((a, b) => b.weight_g - a.weight_g);

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
      {/* Ingredient list */}
      <ul className="divide-y divide-border rounded-xl border bg-card overflow-hidden">
        {sortedItems.map((item) => {
          // Calculate weight in grams from pre-calculated backend weight
          const weightG = item.weight_g * servingsMultiplier;

          // Always show grams/ml as primary display
          const formatted = formatQuantity(weightG, item.ingredient_viscosity, item.ingredient_density);

          const isExpanded = expandedItems.has(item.id);
          const displayPortions = item.ingredient_portions?.filter(
            (p) => !isGramPortion(p.name, p.measuring_unit_name),
          ) ?? [];
          const allPortions = displayPortions.length
            ? calculateNaturalPortions(weightG, displayPortions)
            : [];

          // Highest-priority non-default natural portion (e.g. "Wrap", "Stück", "EL", "TL")
          const highPrioPortion = displayPortions
            ?.filter((p) => !p.is_default && (p.weight_g ?? 0) > 1)
            .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
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
          // additionally show the gram weight so the quantity stays comparable.
          const isGramUnit = highPrioUnitName === 'g' || highPrioUnitName === 'kg'
            || highPrioUnitName === 'ml' || highPrioUnitName === 'l';
          const gramDisplay = highPrioDisplay && !isGramUnit ? formatted.display : null;

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

          const ingredientContent = (
            <div className="flex flex-1 min-w-0 items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-x-2 gap-y-0.5 flex-wrap">
                  <UnitSwitcher
                    originalDisplay={formatted.display}
                    conversions={itemConversions}
                    weightG={weightG}
                  />
                  <span className="font-medium text-foreground text-base">
                    {item.ingredient_name || item.note || 'Zutat'}
                  </span>
                  {item.note && (
                    <span className="text-sm text-muted-foreground italic">
                      ({item.note})
                    </span>
                  )}
                </div>

                {/* Secondary: highest-priority portion + gram weight */}
                {(highPrioDisplay || gramDisplay) && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    {highPrioDisplay && <span>{highPrioDisplay}</span>}
                    {highPrioDisplay && gramDisplay && <span className="text-muted-foreground/40">·</span>}
                    {gramDisplay && <span>{gramDisplay}</span>}
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

          if (item.ingredient_slug) {
            return (
              <li key={item.id}>
                <Link
                  to={`/ingredients/${item.ingredient_slug}`}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3',
                    'hover:bg-muted/50 transition-colors group',
                  )}
                  title={`${item.ingredient_name} – Details anzeigen`}
                >
                  {ingredientContent}
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0">
                    chevron_right
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              {ingredientContent}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
