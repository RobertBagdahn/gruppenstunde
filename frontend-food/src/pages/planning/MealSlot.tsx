import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  PlusCircle,
  X,
  Sliders,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useRecipeSuggestions } from '@/api/mealPlans';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ICONS,
  MEAL_TYPE_COLORS,
  getCoverageStatus,
  NORM_PERSON_DAILY_KCAL,
} from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import { kjToKcal } from '@/utils/nutritionUnits';
import RecipeSearchDialog from './RecipeSearchDialog';
import { FactorInput } from './FactorInput';
import { MealActionsMenu } from '@/components/planning/MealActionsMenu';

export function MealSlot({
  meal,
  canEdit,
  normPortions,
  budgetPerPersonPerDay,
  onDeleteMeal,
  onAddRecipe,
  onAddIngredient,
  onDeleteItem,
  onUpdateItemFactor,
  onUpdateMeal,
  onScaleMeal,
  onCopyFromPlan,
}: {
  meal: Meal;
  canEdit: boolean;
  normPortions: number;
  budgetPerPersonPerDay?: number | null;
  onDeleteMeal: (id: number) => void;
  onAddRecipe: (mealId: number, recipeId: number) => void;
  onAddIngredient: (mealId: number, ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  onDeleteItem: (id: number) => void;
  onUpdateItemFactor: (itemId: number, factor: number) => void;
  onUpdateMeal: (mealId: number, data: {
    note?: string | null;
    override_portions?: number | null;
    day_part_factor?: number | null;
    is_external?: boolean | null;
    external_energy_kcal?: number | null;
    external_cost_per_person?: number | null;
  }) => void;
  onScaleMeal: (mealId: number) => void;
  onCopyFromPlan: (mealId: number) => void;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce search query (200ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: suggestions } = useRecipeSuggestions({
    mealType: meal.meal_type,
    q: debouncedQuery || undefined,
  });

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const handleSelect = (recipeId: number) => {
    onAddRecipe(meal.id, recipeId);
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const results = suggestions ?? [];
    if (!results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex].id);
    } else if (e.key === 'Escape') {
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  const mealColors = MEAL_TYPE_COLORS[meal.meal_type] || MEAL_TYPE_COLORS.snack;
  const isEmpty = meal.items.length === 0;
  const coverage = getCoverageStatus(kjToKcal(meal.total_energy_kj / normPortions), meal.day_part_factor);
  const coverageColorClass = coverage.status === 'good' ? 'text-primary font-semibold' : coverage.status === 'warning' ? 'text-chart-4 font-semibold' : 'text-destructive font-bold';

  const mealTargetKcal = Math.round(NORM_PERSON_DAILY_KCAL * meal.day_part_factor);
  const mealActualKcal = Math.round(kjToKcal(meal.total_energy_kj / normPortions));
  const actualDailyPercent = Math.round((mealActualKcal / NORM_PERSON_DAILY_KCAL) * 100);
  const mealTargetCost = budgetPerPersonPerDay ? budgetPerPersonPerDay * meal.day_part_factor : 0;
  const mealActualCost = meal.total_cost_eur / normPortions;

  return (
    <div className={`px-4 py-3 border-l-4 ${isEmpty && !meal.is_external ? 'border-destructive bg-destructive/5' : mealColors.border}`}>
      {/* Meal Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isEmpty && !meal.is_external ? (
            <AlertCircle className="w-5 h-5 text-destructive animate-pulse" />
          ) : (
            <span className={`material-symbols-outlined text-[20px] ${mealColors.text}`}>
              {MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant'}
            </span>
          )}
          <span className="font-semibold text-base">
            {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
          </span>
          {meal.meal_type !== 'drinks' && (
            <>
              <span className="text-sm text-muted-foreground">
                Soll: {Math.round(meal.day_part_factor * 100)}%
              </span>
              {(!isEmpty || meal.is_external) && meal.total_energy_kj > 0 && (
                <span className={`text-sm font-medium ${coverageColorClass}`}>
                  │ Ist: {actualDailyPercent}%
                </span>
              )}
            </>
          )}

        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              {!meal.is_synced && !meal.is_external && (
                <button
                  onClick={() => {
                    setIsSearching(true);
                    setSearchQuery('');
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/10 transition-colors"
                  title="Rezept hinzufügen"
                >
                  <PlusCircle className="w-4.5 h-4.5 text-primary" />
                </button>
              )}
              <MealActionsMenu
                meal={meal}
                canEdit={canEdit}
                onDeleteMeal={onDeleteMeal}
                onUpdateMeal={onUpdateMeal}
                onScaleMeal={onScaleMeal}
                onCopyFromPlan={() => onCopyFromPlan(meal.id)}
              />
            </>
          )}
        </div>
      </div>

      {/* Meal Note */}
      {meal.note && (
        <div className="pl-7 text-xs text-muted-foreground italic mb-2 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          <span>{meal.note}</span>
        </div>
      )}

      {/* Meal Soll/Ist stats */}
      {(!isEmpty || meal.is_external) && (
        <div className="pl-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
          {meal.meal_type === 'drinks' ? (
            <>
              <span className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/30">
                <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                <span>Kcal: <span className="text-primary font-medium">Ist {mealActualKcal} kcal</span></span>
              </span>
              {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
                <span className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/30">
                  <span className="material-symbols-outlined text-[14px]">payments</span>
                  <span>Preis: Ist {mealActualCost.toFixed(2)} €</span>
                </span>
              )}
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/30">
                <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                <span>Kcal: Soll {mealTargetKcal} / <span className={`${coverageColorClass} font-medium`}>Ist {mealActualKcal} kcal</span></span>
              </span>
              {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
                <span className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/30">
                  <span className="material-symbols-outlined text-[14px]">payments</span>
                  <span>Preis: Soll {mealTargetCost.toFixed(2)} € / Ist {mealActualCost.toFixed(2)} €</span>
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Meal Items */}
      {meal.is_synced && !isEmpty && (
        <p className="text-xs text-primary font-medium pl-7 flex items-center gap-1 mb-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
          Referenz-Mahlzeit
        </p>
      )}
      {isEmpty && !isSearching && (
        <p className="text-sm text-destructive italic pl-7 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-destructive" />
          Noch kein Rezept zugeordnet
        </p>
      )}
      {meal.items.map((item) => (
        <div key={item.id} className={`flex items-start gap-2 pl-7 py-1.5 group ${meal.is_synced ? 'text-muted-foreground' : ''}`}>
          {item.recipe_image && (
            <img
              src={item.recipe_image}
              alt={item.recipe_title}
              className="w-10 h-10 rounded object-cover flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <Link
              to={`/recipes/${item.recipe_slug}`}
              className="text-base hover:text-primary transition-colors truncate block font-medium"
            >
              {item.recipe_title}
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {item.energy_kj != null && (
                <span>{Math.round(kjToKcal(item.energy_kj / normPortions))} kcal</span>
              )}
              {item.cost_eur != null && (
                <span>{(item.cost_eur / normPortions).toFixed(2)} €</span>
              )}
              {canEdit && !meal.is_synced ? (
                <FactorInput value={item.factor} onChange={(f) => onUpdateItemFactor(item.id, f)} />
              ) : (
                item.factor !== 1.0 && <span>&times;{item.factor.toFixed(1).replace('.', ',')}</span>
              )}
            </div>
          </div>
          {canEdit && !meal.is_synced && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Entfernen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Recipe Search */}
      {isSearching && (
        <div className="pl-7 mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rezept suchen..."
              autoFocus
              className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={() => setDialogOpen(true)}
              className="p-1.5 rounded-lg border text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Detailsuche"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
          {suggestions && suggestions.length > 0 && (
            <div className="rounded-lg border bg-card max-h-40 overflow-y-auto divide-y">
              {suggestions.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                    idx === highlightedIndex ? 'bg-muted' : 'hover:bg-muted'
                  }`}
                >
                  <span>{r.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.usage_count}x
                  </span>
                </button>
              ))}
            </div>
          )}
          {debouncedQuery.length >= 1 && suggestions && suggestions.length === 0 && (
            <p className="text-xs text-muted-foreground">Keine Rezepte gefunden</p>
          )}
        </div>
      )}

      {/* Recipe Search Dialog */}
      <RecipeSearchDialog
        mealType={meal.meal_type}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={(recipeId) => handleSelect(recipeId)}
        onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity) => {
          onAddIngredient(meal.id, ingredientId, portionId, measuringUnitId, quantity);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
