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
      <ul className="divide-y divide-border/60 rounded-xl border bg-card/40 overflow-hidden">
        {sortedItems.map((item) => {
          // Calculate weight in grams from pre-calculated backend weight
          const weightG = item.weight_g * servingsMultiplier;

          // Always show grams/ml as primary display
          const formatted = formatQuantity(weightG, item.ingredient_viscosity, item.ingredient_density);

          const isExpanded = expandedItems.has(item.id);
          const allPortions = item.ingredient_portions?.length
            ? calculateNaturalPortions(weightG, item.ingredient_portions)
            : [];

          // Highest-priority non-default portion (e.g. "Stück", "EL", "TL")
          const highPrioPortion = item.ingredient_portions
            ?.filter((p) => !p.is_default && (p.weight_g ?? 0) > 1)
            .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
          const highPrioAmount = highPrioPortion?.weight_g
            ? weightG / highPrioPortion.weight_g
            : null;
          // Show portion subline: use measuring_unit_name with short form.
          // Hide if less than 0.5 of a unit (not useful info).
          const rawUnitName = highPrioPortion?.measuring_unit_name ?? highPrioPortion?.name;
          const highPrioUnitName = rawUnitName ? (UNIT_SHORT[rawUnitName] ?? rawUnitName) : null;
          const highPrioDisplay = highPrioAmount && highPrioAmount >= 0.5 && highPrioUnitName
            ? `${highPrioAmount.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ${highPrioUnitName}`
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

          const ingredientContent = (
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

              {/* Secondary: highest-priority portion + price */}
              {(highPrioDisplay || priceDisplay) && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  {highPrioDisplay && <span>{highPrioDisplay}</span>}
                  {highPrioDisplay && priceDisplay && <span className="text-muted-foreground/40">·</span>}
                  {priceDisplay && <span>{priceDisplay}</span>}
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
          );

          if (item.ingredient_slug) {
            return (
              <li key={item.id}>
                <Link
                  to={`/ingredients/${item.ingredient_slug}`}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3',
                    'hover:bg-rose-50/70 transition-colors group',
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
