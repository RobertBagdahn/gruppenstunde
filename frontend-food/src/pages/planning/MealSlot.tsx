import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  PlusCircle,
  X,
  Sliders,
  RefreshCw,
  FileText,
  Search,
  Shuffle,
  Clock,
} from 'lucide-react';
import { useRecipeSuggestions, useRandomRecipeSuggestion, useAllergenScan } from '@/api/mealPlans';
import { AllergenWarningBadge } from '@/components/shared/AllergenWarningBadge';
import RecipeBadge from '@/components/recipe/RecipeBadge';
import CategoryPills, { RECIPE_TYPE_LABELS } from '@/components/recipe/CategoryPills';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ICONS,
  MEAL_TYPE_COLORS,
  getCoverageStatus,
  NORM_PERSON_DAILY_KCAL,
  effectivePortions,
  formatMealTime,
} from '@/schemas/mealPlan';
import type { Meal, RecipeSearchResult } from '@/schemas/mealPlan';
import RecipeSearchDialog, { MEAL_TYPE_DEFAULT_RECIPE_TYPES } from './RecipeSearchDialog';
import RecipePreviewDialog from './RecipePreviewDialog';
import { FactorInput } from './FactorInput';
import { MealActionsMenu } from '@/components/planning/MealActionsMenu';

export function MealSlot({
  meal,
  canEdit,
  normPortions,
  budgetPerPersonPerDay,
  siblingMeals,
  onDeleteMeal,
  onAddRecipe,
  onAddIngredient,
  onDeleteItem,
  onUpdateItemFactor,
  onUpdateMeal,
  onScaleMeal,
  onCopyFromPlan,
  nutritionalTagIds,
  nutritionalTagNames,
}: {
  meal: Meal;
  canEdit: boolean;
  normPortions: number;
  budgetPerPersonPerDay?: number | null;
  siblingMeals?: Meal[];
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
    start_datetime?: string | null;
    end_datetime?: string | null;
  }) => void;
  onScaleMeal: (mealId: number) => void;
  onCopyFromPlan: (mealId: number) => void;
  nutritionalTagIds?: number[];
  nutritionalTagNames?: string[];
}) {
  const { id } = useParams<{ id: string }>();
  const mealPlanId = Number(id) || 0;
  const { data: scanData } = useAllergenScan(mealPlanId);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [randomPreviewRecipe, setRandomPreviewRecipe] = useState<RecipeSearchResult | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const openSearch = () => {
    const defaults = new Set(MEAL_TYPE_DEFAULT_RECIPE_TYPES[meal.meal_type] ?? []);
    setSelectedTypes(defaults);
    setIsSearching(true);
    setSearchQuery('');
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const recipeTypesArray = selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined;

  const { data: suggestions } = useRecipeSuggestions({
    mealType: recipeTypesArray ? undefined : meal.meal_type,
    recipeTypes: recipeTypesArray,
    q: debouncedQuery || undefined,
    excludeNutritionalTagIds: nutritionalTagIds?.length ? nutritionalTagIds : undefined,
  });

  const randomQuery = useRandomRecipeSuggestion({
    mealType: meal.meal_type,
    excludeNutritionalTagIds: nutritionalTagIds?.length ? nutritionalTagIds : undefined,
  });

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const handleSelect = (recipeId: number) => {
    onAddRecipe(meal.id, recipeId);
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleRandomSuggest = () => {
    randomQuery.refetch().then((result) => {
      const suggestions = result.data;
      if (suggestions && suggestions.length > 0) {
        const s = suggestions[0];
        setRandomPreviewRecipe({
          id: s.id,
          title: s.title,
          slug: '',
          recipe_type: s.recipe_type ?? '',
          image: s.image_thumbnail,
          recipe_badge: (s.recipe_badge as RecipeSearchResult['recipe_badge']) ?? 'community',
          price_per_serving: s.price_per_serving ?? null,
          usage_count: s.usage_count,
        });
      }
    });
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
  const effPortions = effectivePortions(meal, normPortions);
  const coverage = getCoverageStatus(meal.total_energy_kcal / effPortions, meal.day_part_factor);
  const coverageColorClass = coverage.status === 'good' ? 'text-primary font-semibold' : coverage.status === 'warning' ? 'text-chart-4 font-semibold' : 'text-destructive font-bold';

  const mealTargetKcal = Math.round(NORM_PERSON_DAILY_KCAL * meal.day_part_factor);
  const mealActualKcal = Math.round(meal.total_energy_kcal / effPortions);
  // Soll-Erfüllungsgrad der Mahlzeit (Ist gegen Mahlzeit-Soll), getrennt vom Tagesanteil.
  const fulfillmentPercent = coverage.percent;
  const mealTargetCost = budgetPerPersonPerDay ? budgetPerPersonPerDay * meal.day_part_factor : 0;
  const mealActualCost = meal.total_cost_eur / effPortions;
  const mealTime = formatMealTime(meal.start_datetime);

  const showEditUI = canEdit && !meal.is_synced && !meal.is_external;

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
              {(!isEmpty || meal.is_external) && meal.total_energy_kcal > 0 && (
                <span className={`text-sm font-medium ${coverageColorClass}`}>
                  │ Ist: {fulfillmentPercent}% erfüllt
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
                  onClick={openSearch}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/10 transition-colors"
                  title="Rezept hinzufügen"
                >
                  <PlusCircle className="w-4.5 h-4.5 text-primary" />
                </button>
              )}
              <MealActionsMenu
                meal={meal}
                canEdit={canEdit}
                siblingMeals={siblingMeals}
                onDeleteMeal={onDeleteMeal}
                onUpdateMeal={onUpdateMeal}
                onScaleMeal={onScaleMeal}
                onCopyFromPlan={() => onCopyFromPlan(meal.id)}
              />
            </>
          )}
        </div>
      </div>

      {/* Meal Time */}
      {mealTime && (
        <div className="pl-7 text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {mealTime}
            {formatMealTime(meal.end_datetime) && `–${formatMealTime(meal.end_datetime)}`}
          </span>
        </div>
      )}

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

      {/* Empty state CTA */}
      {isEmpty && !isSearching && showEditUI && (
        <div className="pl-7 space-y-2">
          <button
            onClick={() => setDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
          >
            <Search className="w-4 h-4" />
            Rezept oder Zutat wählen
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleRandomSuggest}
              disabled={randomQuery.isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-primary border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Shuffle className="w-3 h-3" />
              Rezept vorschlagen
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="text-xs text-destructive italic hover:underline"
            >
              <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
              Noch kein Rezept zugeordnet
            </button>
          </div>
        </div>
      )}

      {isEmpty && !isSearching && !showEditUI && (
        <p className="text-sm text-destructive italic pl-7 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-destructive" />
          Noch kein Rezept zugeordnet
        </p>
      )}

      {meal.items.map((item) => {
        const itemViolations = scanData?.violations.filter(
          (v) => v.meal_id === meal.id && v.recipe_id === item.recipe_id
        ) || [];
        const itemAllergenTags = itemViolations.map((v) => v.nutritional_tag);

        return (
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
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/recipes/${item.recipe_slug}`}
                  className="text-base hover:text-primary transition-colors truncate block font-medium"
                >
                  {item.recipe_title}
                </Link>
                <AllergenWarningBadge allergenTags={itemAllergenTags} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {item.energy_kcal != null && (
                  <span>{Math.round(item.energy_kcal / effPortions)} kcal</span>
                )}
                {item.cost_eur != null && (
                  <span>{(item.cost_eur / effPortions).toFixed(2)} €</span>
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
        );
      })}

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
          <CategoryPills
            selected={selectedTypes}
            onChange={setSelectedTypes}
            showAll={false}
          />
          {suggestions && suggestions.length > 0 && (
            <div className="rounded-lg border bg-card max-h-48 overflow-y-auto divide-y">
              {suggestions.map((r, idx) => {
                const price = r.price_per_serving != null
                  ? `${r.price_per_serving.toFixed(2).replace('.', ',')} €`
                  : '—';
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-start gap-2.5 ${
                      idx === highlightedIndex ? 'bg-muted' : 'hover:bg-muted'
                    }`}
                  >
                    {r.image_thumbnail && (
                      <img
                        src={r.image_thumbnail}
                        alt=""
                        className="w-9 h-9 rounded object-cover shrink-0 mt-0.5"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <RecipeBadge badge={(r.recipe_badge as 'verified' | 'community' | 'draft') ?? 'community'} />
                        <span className="truncate font-medium">{r.title}</span>
                        {r.recipe_type && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                            {RECIPE_TYPE_LABELS[r.recipe_type] ?? r.recipe_type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{price}</span>
                        <span>{r.usage_count}× verwendet</span>
                      </div>
                    </div>
                  </button>
                );
              })}
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
        nutritionalTagIds={nutritionalTagIds}
        nutritionalTagNames={nutritionalTagNames}
      />

      {/* Random Recipe Preview */}
      <RecipePreviewDialog
        recipe={randomPreviewRecipe}
        open={!!randomPreviewRecipe}
        onOpenChange={(open) => { if (!open) setRandomPreviewRecipe(null); }}
        onConfirm={(recipeId) => {
          handleSelect(recipeId);
          setRandomPreviewRecipe(null);
        }}
      />
    </div>
  );
}
