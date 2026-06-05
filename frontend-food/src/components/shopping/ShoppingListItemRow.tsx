/**
 * ShoppingListItemRow — Single item row with checkbox, quantity, and natural portions.
 * Touch-friendly: 44x44px minimum tap target for the checkbox.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ShoppingListItem } from '@/schemas/shoppingList';
import { Check, ChevronRight, ChevronDown } from 'lucide-react';

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
  const [portionsExpanded, setPortionsExpanded] = useState(false);

  const hasSources = item.sources && item.sources.length > 0;
  const hasPortionOptions = item.portion_options && item.portion_options.length > 1;

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
    if (g === 0) return '';
    if (unit !== 'g') {
      const rounded = Math.round(g * 100) / 100;
      return `${rounded} ${unit}`;
    }
    if (g >= 1000) {
      const kg = g / 1000;
      return kg === Math.floor(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
    }
    return `${Math.round(g)} g`;
  };

  return (
    <div className="font-sans">
      <div
        className={cn(
          'flex items-center gap-3 py-2 px-2 -mx-2 rounded-xl transition-colors',
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
            'flex items-center justify-center w-11 h-11 shrink-0 rounded-xl border-2 transition-all shadow-soft',
            item.is_checked
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/30 hover:border-primary bg-card',
            !canEdit && 'cursor-default opacity-50',
          )}
          aria-label={item.is_checked ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
        >
          {item.is_checked && (
            <Check className="w-5 h-5 stroke-[3px]" />
          )}
        </button>

          {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => hasSources && setSourcesExpanded(!sourcesExpanded)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {hasSources && (
              <ChevronRight className={cn(
                'w-4 h-4 text-muted-foreground transition-transform duration-200',
                sourcesExpanded && 'rotate-90',
              )} />
            )}
            {item.ingredient_slug ? (
              <Link
                to={`/ingredients/${item.ingredient_slug}`}
                className={cn(
                  'font-semibold text-sm hover:text-primary transition-colors text-foreground',
                  item.is_checked && 'line-through text-muted-foreground',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {item.name}
              </Link>
            ) : (
              <span
                className={cn(
                  'font-semibold text-sm text-foreground',
                  item.is_checked && 'line-through text-muted-foreground',
                )}
              >
                {item.name}
              </span>
            )}
            {item.quantity_g > 0 && (
              <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40">
                {item.display_quantity || formatQuantity(item.quantity_g, item.unit)}
              </span>
            )}
          </div>
          {/* Natural portions & price */}
          <div className="flex items-center gap-2 mt-0.5">
            {item.natural_portions && (
              <button
                type="button"
                onClick={() => hasPortionOptions && setPortionsExpanded(!portionsExpanded)}
                className={cn(
                  'inline-flex items-center gap-1 text-xs transition-colors',
                  hasPortionOptions ? 'text-muted-foreground/70 hover:text-muted-foreground cursor-pointer' : 'text-muted-foreground/70',
                )}
              >
                {hasPortionOptions && (
                  <ChevronDown className={cn(
                    'w-3 h-3 transition-transform duration-200',
                    portionsExpanded && 'rotate-180',
                  )} />
                )}
                {item.natural_portions}
              </button>
            )}
            {item.estimated_price_eur !== null && item.estimated_price_eur !== undefined && (
              <span className="text-xs font-semibold text-foreground">
                {item.estimated_price_eur.toFixed(2)} €
              </span>
            )}
            {item.estimated_price_eur === null && item.ingredient_id && (
              <span className="text-xs text-red-400">kein Preis</span>
            )}
          </div>
          {item.note && (
            <p className="text-xs text-muted-foreground italic mt-0.5">{item.note}</p>
          )}
          {/* Expanded portion options */}
          {portionsExpanded && hasPortionOptions && (
            <div className="mt-1.5 space-y-0.5">
              {item.portion_options.map((opt, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-2 text-xs pl-4',
                    opt.is_default ? 'text-muted-foreground font-semibold' : 'text-muted-foreground/60',
                  )}
                >
                  <span className="text-muted-foreground/40">&#8226;</span>
                  <span>{opt.display}</span>
                  {opt.is_default && (
                    <span className="text-[10px] text-muted-foreground/40 font-normal">(Standard)</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Real-time checker indicator */}
          {showChecker && recentChecker && (
            <p className="text-xs text-primary font-semibold mt-0.5 animate-fade-inUp">
              {recentChecker} hat abgehakt
            </p>
          )}
        </div>

        {/* Checked-by indicator */}
        {item.is_checked && item.checked_by_username && !showChecker && (
          <span className="text-xs font-semibold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-lg border border-border/40 shrink-0">
            {item.checked_by_username}
          </span>
        )}
      </div>

      {/* Expanded sources */}
      {sourcesExpanded && hasSources && (
        <div className="pl-16 pr-2 pb-2.5 space-y-1.5">
          {item.sources.map((source, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-muted-foreground/60">&#8226;</span>
                {source.recipe_slug ? (
                  <Link
                    to={`/recipes/${source.recipe_slug}`}
                    className="hover:text-primary hover:underline transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {source.recipe_name}
                  </Link>
                ) : (
                  <span>{source.recipe_name}</span>
                )}
                {source.meal_label && (
                  <span className="text-muted-foreground/60 font-normal">({source.meal_label})</span>
                )}
              </div>
              <span className="font-semibold">{Math.round(source.quantity_g)} g</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
