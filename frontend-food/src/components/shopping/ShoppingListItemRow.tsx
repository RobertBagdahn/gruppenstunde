/**
 * ShoppingListItemRow — Single item row with checkbox, quantity, and natural portions.
 * Touch-friendly: 44x44px minimum tap target for the checkbox.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ShoppingListItem } from '@/schemas/shoppingList';

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  canEdit: boolean;
  onCheck: (itemId: number, isChecked: boolean) => void;
  /** Name of the user who just checked this item (for real-time indicator) */
  recentChecker?: string | null;
}

export default function ShoppingListItemRow({
  item,
  canEdit,
  onCheck,
  recentChecker,
}: ShoppingListItemRowProps) {
  const [showChecker, setShowChecker] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const hasSources = item.sources && item.sources.length > 0;

  // Show the recent checker name briefly, then fade out
  useEffect(() => {
    if (recentChecker) {
      setShowChecker(true);
      const timer = setTimeout(() => setShowChecker(false), 3000);
      return () => clearTimeout(timer);
    }
    setShowChecker(false);
  }, [recentChecker]);

  const formatQuantity = (g: number, unit: string): string => {
    if (unit !== 'g' || g === 0) {
      return g > 0 ? `${g} ${unit}` : '';
    }
    if (g >= 1000) {
      const kg = g / 1000;
      return kg === Math.floor(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
    }
    return `${Math.round(g)} g`;
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg transition-colors',
          item.is_checked && 'opacity-60',
          canEdit && 'hover:bg-muted/50',
        )}
      >
        {/* Checkbox — 44x44px touch target */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onCheck(item.id, !item.is_checked)}
          className={cn(
            'flex items-center justify-center w-11 h-11 shrink-0 rounded-lg border-2 transition-all',
            item.is_checked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-muted-foreground/30 hover:border-primary',
            !canEdit && 'cursor-default opacity-50',
          )}
          aria-label={item.is_checked ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
        >
          {item.is_checked && (
            <span className="material-symbols-outlined text-[20px]">check</span>
          )}
        </button>

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => hasSources && setSourcesExpanded(!sourcesExpanded)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {hasSources && (
              <span className={cn(
                'material-symbols-outlined text-[14px] text-muted-foreground transition-transform',
                sourcesExpanded && 'rotate-90',
              )}>
                chevron_right
              </span>
            )}
            {item.ingredient_slug ? (
              <Link
                to={`/ingredients/${item.ingredient_slug}`}
                className={cn(
                  'font-medium text-sm hover:text-primary transition-colors',
                  item.is_checked && 'line-through text-muted-foreground',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {item.name}
              </Link>
            ) : (
              <span
                className={cn(
                  'font-medium text-sm',
                  item.is_checked && 'line-through text-muted-foreground',
                )}
              >
                {item.name}
              </span>
            )}
            {item.quantity_g > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatQuantity(item.quantity_g, item.unit)}
              </span>
            )}
          </div>
          {item.note && (
            <p className="text-xs text-muted-foreground italic mt-0.5">{item.note}</p>
          )}
          {/* Real-time checker indicator */}
          {showChecker && recentChecker && (
            <p className="text-xs text-emerald-600 font-medium mt-0.5 animate-fade-in">
              {recentChecker} hat abgehakt
            </p>
          )}
        </div>

        {/* Checked-by indicator */}
        {item.is_checked && item.checked_by_username && !showChecker && (
          <span className="text-xs text-muted-foreground shrink-0">
            {item.checked_by_username}
          </span>
        )}
      </div>

      {/* Expanded sources */}
      {sourcesExpanded && hasSources && (
        <div className="pl-16 pr-2 pb-2 space-y-1">
          {item.sources.map((source, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/60">&#8226;</span>
                {source.recipe_slug ? (
                  <Link
                    to={`/recipes/${source.recipe_slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {source.recipe_name}
                  </Link>
                ) : (
                  <span>{source.recipe_name}</span>
                )}
                {source.meal_label && (
                  <span className="text-muted-foreground/60">({source.meal_label})</span>
                )}
              </div>
              <span>{Math.round(source.quantity_g)} g</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
