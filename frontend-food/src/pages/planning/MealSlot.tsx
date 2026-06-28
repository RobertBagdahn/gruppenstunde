import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  Sparkles,
} from 'lucide-react';
import { useRecipeSuggestions, useRandomRecipeSuggestion, useIngredientScan } from '@/api/mealPlans';
import { NutriTagBadge } from '@/components/shared/NutriTagBadge';
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
  const navigate = useNavigate();
  const { data: scanData } = useIngredientScan(mealPlanId);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [randomPreviewRecipe, setRandomPreviewRecipe] = useState<RecipeSearchResult | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [showWizardWarning, setShowWizardWarning] = useState(false);

  const excludedRecipeIds = useMemo(
    () => new Set(meal.items.filter((i) => i.recipe_id != null).map((i) => i.recipe_id!)),
    [meal.items],
  );
  const excludedIngredientIds = useMemo(
    () => new Set(meal.items.filter((i) => i.ingredient_id != null).map((i) => i.ingredient_id!)),
    [meal.items],
  );

  const handleOpenWizard = () => {
    if (meal.items.length > 0) {
      setShowWizardWarning(true);
    } else {
      navigate(`/meal-plans/${mealPlanId}/meals/${meal.id}/breakfast-wizard`);
    }
  };

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
                <>
                  {meal.meal_type === 'breakfast' && !isEmpty && (
                    <button
                      onClick={handleOpenWizard}
                      className="p-1 rounded text-chart-4 hover:bg-chart-4/10 transition-colors"
                      title="Frühstücksassistent"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={openSearch}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/10 transition-colors"
                    title="Rezept hinzufügen"
                  >
                    <PlusCircle className="w-4.5 h-4.5 text-primary" />
                  </button>
                </>
              )}
              <MealActionsMenu
                meal={meal}
                canEdit={canEdit}
                planId={mealPlanId}
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
          {meal.meal_type === 'breakfast' && (
            <button
              onClick={handleOpenWizard}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-chart-4/30 text-chart-4 hover:bg-chart-4/5 transition-colors text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Frühstücksassistent
            </button>
          )}
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

       {(() => {
         // Group variant items by variant_group_id, keep regular items separate
         const regularItems: typeof meal.items = [];
         const variantGroups = new Map<string, typeof meal.items>();
         for (const item of meal.items) {
           if (item.factor < 0.01) continue;
           if (item.variant_group_id) {
             const existing = variantGroups.get(item.variant_group_id) ?? [];
             existing.push(item);
             variantGroups.set(item.variant_group_id, existing);
           } else {
             regularItems.push(item);
           }
         }

         const rendered: React.ReactNode[] = [];

         // Render regular items
         for (const item of regularItems) {
           const isIngredient = !item.recipe_id && item.ingredient_id;
           const itemViolations = scanData?.violations.filter(
             (v) => v.meal_id === meal.id && v.recipe_id === item.recipe_id
           ) || [];
           const itemAllergenTags = itemViolations.map((v) => v.nutritional_tag);
           const displayName = isIngredient ? item.ingredient_name : item.recipe_title;

            rendered.push(
              <div key={item.id} className="pl-7 py-1">
                <div className={`rounded-lg p-3 border ${mealColors.bg} ${mealColors.border}/30 group ${meal.is_synced ? 'text-muted-foreground' : ''}`}>
                  <div className="flex items-start gap-3">
                    {item.recipe_image && (
                      <img
                        src={item.recipe_image}
                        alt={displayName}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.recipe_id && item.recipe_slug ? (
                          <Link
                            to={`/recipes/${item.recipe_slug}`}
                            className="text-base hover:text-primary transition-colors truncate block font-medium"
                          >
                            {displayName}
                          </Link>
                        ) : item.ingredient_id ? (
                          <Link
                            to={`/ingredients/${item.ingredient_slug}`}
                            className="text-base hover:text-primary transition-colors truncate block font-medium"
                          >
                            {displayName}
                          </Link>
                        ) : (
                          <span className="text-base truncate block font-medium">
                            {displayName}
                          </span>
                        )}
                        {isIngredient && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">
                            Zutat
                          </span>
                        )}
                        <NutriTagBadge allergenTags={itemAllergenTags} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {item.energy_kcal != null && (
                          <span>{Math.round(item.energy_kcal / effPortions)} kcal</span>
                        )}
                        {item.cost_eur != null && (
                          <span>{(item.cost_eur / effPortions).toFixed(2)} €</span>
                        )}
                         {canEdit && !meal.is_synced ? (
                           <>
                             {isIngredient && item.quantity != null && (
                               <span className="text-xs text-muted-foreground">
                                 &times;{item.quantity}
                                 {item.measuring_unit_name ? ` ${item.measuring_unit_name}` : ''}
                               </span>
                             )}
                             <FactorInput value={item.factor} onChange={(f) => onUpdateItemFactor(item.id, f)} />
                           </>
                         ) : (
                           <>
                             {isIngredient && item.quantity != null && (
                               <span>&times;{item.quantity}{item.measuring_unit_name ? ` ${item.measuring_unit_name}` : ''}</span>
                             )}
                             {item.factor !== 1.0 && <span>&times;{item.factor.toFixed(2).replace('.', ',')}</span>}
                           </>
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
                </div>
              </div>
           );
         }

         // Render variant groups (with recipe header + indented children)
         for (const [groupId, variants] of variantGroups) {
           const first = variants[0];
           const itemViolations = scanData?.violations.filter(
             (v) => v.meal_id === meal.id && v.recipe_id === first.recipe_id
           ) || [];
           const itemAllergenTags = itemViolations.map((v) => v.nutritional_tag);

            rendered.push(
              <div key={groupId} className="pl-7 py-1">
                <div className={`rounded-lg p-3 border ${mealColors.bg} ${mealColors.border}/30`}>
                  {/* Recipe header */}
                  <div className="flex items-center gap-2 mb-1">
                    {first.recipe_image && (
                      <img
                        src={first.recipe_image}
                        alt={first.recipe_title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {first.recipe_id && first.recipe_slug ? (
                          <Link
                            to={`/recipes/${first.recipe_slug}`}
                            className="text-base hover:text-primary transition-colors truncate block font-medium"
                          >
                            {first.recipe_title}
                          </Link>
                        ) : (
                          <span className="text-base truncate block font-medium">
                            {first.recipe_title}
                          </span>
                        )}
                        <NutriTagBadge allergenTags={itemAllergenTags} />
                      </div>
                    </div>
                  </div>
                  {/* Variant children */}
                  <div className="space-y-1">
                    {variants.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 ml-6 py-0.5 group">
                        <span className="text-sm text-muted-foreground flex-1">
                          {v.display_name || v.recipe_title}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {v.energy_kcal != null && (
                            <span>{Math.round(v.energy_kcal / effPortions)} kcal</span>
                          )}
                          {canEdit && !meal.is_synced ? (
                            <FactorInput value={v.factor} onChange={(f) => onUpdateItemFactor(v.id, f)} />
                          ) : (
                            <span className="text-xs">&times;{v.factor.toFixed(2).replace('.', ',')}</span>
                          )}
                        </div>
                        {canEdit && !meal.is_synced && (
                          <button
                            onClick={() => onDeleteItem(v.id)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            title="Entfernen"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
           );
         }

         return rendered;
       })()}

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
        excludedRecipeIds={excludedRecipeIds}
        excludedIngredientIds={excludedIngredientIds}
      />

      {/* Warning dialog for overwriting existing items */}
      {showWizardWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-xl border border-border p-6 max-w-sm mx-4 space-y-4">
            <h3 className="font-display font-bold text-lg">Frühstück ersetzen?</h3>
            <p className="text-sm text-muted-foreground">
              Dieses Frühstück enthält bereits Einträge. Der Assistent wird alle vorhandenen Einträge ersetzen. Fortfahren?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowWizardWarning(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  setShowWizardWarning(false);
                  navigate(`/meal-plans/${mealPlanId}/meals/${meal.id}/breakfast-wizard`);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Trotzdem ersetzen
              </button>
            </div>
          </div>
        </div>
      )}

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
