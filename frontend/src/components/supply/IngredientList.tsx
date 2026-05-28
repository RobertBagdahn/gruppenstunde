/**
 * IngredientList — Displays recipe ingredients (RecipeItems) with quantities,
 * PortionScaler, intelligent unit conversion, and natural portion display.
 *
 * Used on RecipeDetailPage and other recipe views.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RecipeItem } from '@/schemas/recipe';
import { formatQuantity, scaleQuantity } from '@/lib/unitConversion';
import { calculateNaturalPortions, getPrimaryPortionDisplay } from '@/lib/portionDisplay';
import PortionScaler from '@/components/recipe/PortionScaler';
import { cn } from '@/lib/utils';

/** Units that represent weight or volume and should use formatQuantity() */
const WEIGHT_VOLUME_UNITS = new Set([
  'gramm', 'g', 'kilogramm', 'kg', 'milliliter', 'ml', 'liter', 'l',
]);

interface IngredientListProps {
  items: RecipeItem[];
  servings: number | null;
  servingsMultiplier: number;
  onServingsChange: (multiplier: number) => void;
  className?: string;
}

export default function IngredientList({
  items,
  servings: _servings,
  servingsMultiplier,
  onServingsChange,
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

  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);

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
      {/* PortionScaler */}
      <PortionScaler
        defaultServings={servingsMultiplier}
        onChange={onServingsChange}
        className="mb-4"
      />

      {/* Ingredient list */}
      <ul className="space-y-1">
        {sortedItems.map((item) => {
          const scaledQty = scaleQuantity(item.quantity, servingsMultiplier);

          // Determine if this is a weight/volume unit
          const unitName = item.measuring_unit_name ?? '';
          const isWeightOrVolume = WEIGHT_VOLUME_UNITS.has(unitName.toLowerCase());

          let displayText: string;
          let weightG: number;
          let primaryPortion: string | null = null;
          let allPortions: Array<{ display: string }> = [];

          if (isWeightOrVolume) {
            // Calculate weight in grams for the scaled quantity
            const portionWeightG = item.ingredient_portions?.find(
              (p) => p.id === item.portion_id,
            )?.weight_g;
            weightG = portionWeightG
              ? scaledQty * portionWeightG
              : scaledQty;

            // Format with intelligent unit conversion
            const formatted = formatQuantity(
              weightG,
              item.ingredient_viscosity,
              item.ingredient_density,
            );
            displayText = formatted.display;

            // Natural portion display
            primaryPortion = item.ingredient_portions?.length
              ? getPrimaryPortionDisplay(weightG, item.ingredient_portions)
              : null;

            allPortions = item.ingredient_portions?.length
              ? calculateNaturalPortions(weightG, item.ingredient_portions)
              : [];
          } else {
            // Non-weight unit: display quantity + unit name directly
            const qtyDisplay = scaledQty % 1 === 0 ? scaledQty.toString() : scaledQty.toFixed(1).replace('.', ',');
            displayText = `${qtyDisplay} ${unitName}`;
            weightG = 0;
          }

          const isExpanded = expandedItems.has(item.id);

          const ingredientContent = (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="material-symbols-outlined text-rose-500 text-[18px] shrink-0">
                  check_circle
                </span>
                <span className="font-semibold text-foreground">
                  {displayText}
                </span>
                <span className="font-medium text-foreground">
                  {item.ingredient_name ?? 'Unbekannt'}
                </span>
                {item.note && (
                  <span className="text-xs text-muted-foreground italic">
                    ({item.note})
                  </span>
                )}
              </div>

              {/* Primary natural portion */}
              {primaryPortion && (
                <div className="ml-7 mt-0.5 flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {primaryPortion}
                  </span>
                  {allPortions.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleExpanded(item.id);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {isExpanded ? 'weniger' : `+${allPortions.length - 1} weitere`}
                    </button>
                  )}
                </div>
              )}

              {/* Expanded: all portions */}
              {isExpanded && allPortions.length > 1 && (
                <div className="ml-7 mt-1 space-y-0.5">
                  {allPortions.slice(1).map((np, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-muted-foreground"
                    >
                      {np.display}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );

          if (item.ingredient_slug) {
            return (
              <li key={item.id} className="text-sm">
                <Link
                  to={`/ingredients/${item.ingredient_slug}`}
                  className={cn(
                    'flex items-start gap-2 p-2 -mx-2 rounded-lg',
                    'hover:bg-rose-50 hover:border-rose-200 transition-colors group',
                  )}
                  title={`${item.ingredient_name} – Details anzeigen`}
                >
                  {ingredientContent}
                  <span className="material-symbols-outlined text-[14px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0">
                    arrow_forward
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.id} className="flex items-start gap-2 text-sm p-2 -mx-2">
              {ingredientContent}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
