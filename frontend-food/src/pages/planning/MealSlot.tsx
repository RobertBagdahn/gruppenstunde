import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  PlusCircle,
  X,
  RefreshCw,
  FileText,
  Search,
  Shuffle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useRandomRecipeSuggestion, useIngredientScan } from '@/api/mealPlans';
import { NutriTagBadge } from '@/components/shared/NutriTagBadge';
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
import RecipeSearchDialog from './RecipeSearchDialog';
import RecipePreviewDialog from './RecipePreviewDialog';
import { FactorInput } from './FactorInput';
import { QuantityInput } from './QuantityInput';
import { MealActionsMenu } from '@/components/planning/MealActionsMenu';
import RecipeThumbnail from '@/components/recipe/RecipeThumbnail';

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
  onUpdateItemQuantity,
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
  onUpdateItemQuantity?: (itemId: number, quantity: number) => void;
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [randomPreviewRecipe, setRandomPreviewRecipe] = useState<RecipeSearchResult | null>(null);
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

  const randomQuery = useRandomRecipeSuggestion({
    mealType: meal.meal_type,
    excludeNutritionalTagIds: nutritionalTagIds?.length ? nutritionalTagIds : undefined,
  });

  const handleSelect = (recipeId: number) => {
    onAddRecipe(meal.id, recipeId);
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
          image_url: s.image_thumbnail,
          recipe_badge: (s.recipe_badge as RecipeSearchResult['recipe_badge']) ?? 'community',
          price_per_serving: s.price_per_serving ?? null,
          usage_count: s.usage_count,
        });
      }
    });
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
  const isPortionUnit = (name: string) => !['g', 'ml'].includes(name.toLowerCase());

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
                    onClick={() => setDialogOpen(true)}
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
      {isEmpty && showEditUI && (
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

      {isEmpty && !showEditUI && (
        <p className="text-sm text-destructive italic pl-7 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-destructive" />
          Noch kein Rezept zugeordnet
        </p>
      )}

        {(() => {
          if (meal.meal_type !== 'breakfast') {
            // Non-breakfast: existing single-card rendering
            const regItems: typeof meal.items = [];
            const vGroups = new Map<string, typeof meal.items>();
            for (const it of meal.items) {
              if (it.factor < 0.01) continue;
              if (it.variant_group_id) {
                const ex = vGroups.get(it.variant_group_id) ?? [];
                ex.push(it);
                vGroups.set(it.variant_group_id, ex);
              } else { regItems.push(it); }
            }
            const out: React.ReactNode[] = [];
            for (const it of regItems) {
              const isIng = !it.recipe_id && it.ingredient_id;
              const viol = (scanData?.violations.filter((v) => v.meal_id === meal.id && v.recipe_id === it.recipe_id) || []);
              const allTags = viol.map((v) => v.nutritional_tag);
              const dName = isIng ? it.ingredient_name : it.recipe_title;
              out.push(
                <div key={it.id} className="pl-7 py-1">
                  <div className={`rounded-lg p-3 border ${mealColors.bg} ${mealColors.border}/30 group ${meal.is_synced ? 'text-muted-foreground' : ''}`}>
                    <div className="flex items-start gap-3">
                      {it.recipe_id && <RecipeThumbnail imageUrl={it.image_url} title={dName} size="xs" imgClassName="rounded" className="rounded" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {it.recipe_id && it.recipe_slug ? <Link to={`/recipes/${it.recipe_slug}`} className="text-base hover:text-primary transition-colors truncate block font-medium">{dName}</Link>
                            : it.ingredient_id ? <Link to={`/ingredients/${it.ingredient_slug}`} className="text-base hover:text-primary transition-colors truncate block font-medium">{dName}</Link>
                            : <span className="text-base truncate block font-medium">{dName}</span>}
                          {isIng && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">Zutat</span>}
                          <NutriTagBadge allergenTags={allTags} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          {it.energy_kcal != null && <span>{Math.round(it.energy_kcal / effPortions)} kcal</span>}
                          {it.cost_eur != null && <span>{(it.cost_eur / effPortions).toFixed(2)} €</span>}
                          {isIng && !meal.is_synced && isPortionUnit(it.measuring_unit_name) ? (
                            // NEW format: portion-based, editable
                            <>
                              {onUpdateItemQuantity ? <QuantityInput value={it.quantity ?? 0} onChange={(q) => onUpdateItemQuantity(it.id, q)} /> : <FactorInput value={it.factor} onChange={(f) => onUpdateItemFactor(it.id, f)} />}
                              <span className="text-xs text-muted-foreground">{it.measuring_unit_name}{it.quantity_g != null ? <span className="text-muted-foreground/60 ml-0.5">({Math.round(it.quantity_g)}g)</span> : ''}</span>
                            </>
                          ) : isIng && !meal.is_synced ? (
                            // OLD format: raw unit, editable — show grams only
                            // TODO (4.1): Enhance to show portion hints like breakfast wizard:
                            // When ingredient portions are available, use:
                            // formatGramsWithPortionHint(it.quantity_g, ingredientPortions)
                            // Requires: fetch/cache ingredient portions from breakfast_catalog API or /ingredients/{slug} endpoint
                            <span className="text-xs text-muted-foreground">{Math.round(it.quantity_g ?? 0)}g</span>
                          ) : isIng && it.portion_display ? (
                             // portion_display from backend (read-only)
                             <span className={`text-xs ${it.has_missing_weight ? 'text-orange-500' : 'text-muted-foreground'}`}>
                               {it.portion_display}
                               {it.is_per_norm_person && <span className="ml-1 text-[10px] text-muted-foreground/60">/ Person</span>}
                             </span>
                           ) : isIng && isPortionUnit(it.measuring_unit_name) ? (
                             // Portion-based, read-only fallback
                             <span>&times;{it.quantity?.toFixed(2).replace('.', ',')} {it.measuring_unit_name}</span>
                           ) : isIng ? (
                             // Raw unit, read-only fallback
                             <span className="text-xs">{Math.round(it.quantity_g ?? 0)}g</span>
                           ) : canEdit && !meal.is_synced ? <FactorInput value={it.factor} onChange={(f) => onUpdateItemFactor(it.id, f)} /> : (it.factor !== 1.0 && <span>&times;{it.factor.toFixed(2).replace('.', ',')}</span>)}
                        </div>
                      </div>
                      {canEdit && !meal.is_synced && <button onClick={() => onDeleteItem(it.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>}
                    </div>
                  </div>
                </div>
              );
            }
            // Variant groups
            for (const [, variants] of vGroups) {
              const first = variants[0];
              const viol = (scanData?.violations.filter((v) => v.meal_id === meal.id && v.recipe_id === first.recipe_id) || []);
              const allTags = viol.map((v) => v.nutritional_tag);
              out.push(
                <div key={first.variant_group_id} className="pl-7 py-1">
                  <div className={`rounded-lg p-3 border ${mealColors.bg} ${mealColors.border}/30`}>
                    <div className="flex items-center gap-2 mb-1">
                      {first.recipe_id && <RecipeThumbnail imageUrl={first.image_url} title={first.recipe_title} size="xs" imgClassName="rounded" className="rounded" />}
                      <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 flex-wrap">{first.recipe_id && first.recipe_slug ? <Link to={`/recipes/${first.recipe_slug}`} className="text-base hover:text-primary transition-colors truncate block font-medium">{first.recipe_title}</Link> : <span className="text-base truncate block font-medium">{first.recipe_title}</span>}<NutriTagBadge allergenTags={allTags} /></div></div>
                    </div>
                    <div className="space-y-1">
                      {variants.map((v) => (
                        <div key={v.id} className="flex items-center gap-2 ml-6 py-0.5 group">
                          <span className="text-sm text-muted-foreground flex-1">{v.display_name || v.recipe_title}</span>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {v.energy_kcal != null && <span>{Math.round(v.energy_kcal / effPortions)} kcal</span>}
                            {canEdit && !meal.is_synced ? <FactorInput value={v.factor} onChange={(f) => onUpdateItemFactor(v.id, f)} /> : <span className="text-xs">&times;{v.factor.toFixed(2).replace('.', ',')}</span>}
                          </div>
                          {canEdit && !meal.is_synced && <button onClick={() => onDeleteItem(v.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return out;
          }

          // Breakfast: group by ingredient_tags
          const categories: { key: string; label: string; items: typeof meal.items; order: number }[] = [
            { key: 'base', label: 'Brot', items: [], order: 1 },
            { key: 'topping', label: 'Belag', items: [], order: 2 },
            { key: 'warm', label: 'Warme Gerichte', items: [], order: 3 },
            { key: 'drink', label: 'Getränke', items: [], order: 4 },
            { key: 'extra', label: 'Extras', items: [], order: 5 },
            { key: 'other', label: 'Weitere', items: [], order: 6 },
          ];
          const catMap = new Map(categories.map((c) => [c.key, c]));

          for (const item of meal.items) {
            if (item.factor < 0.01) continue;
            const itags = new Set(item.ingredient_tags);
            if (itags.has('breakfast-base')) catMap.get('base')!.items.push(item);
            else if (itags.has('breakfast-topping')) catMap.get('topping')!.items.push(item);
            else if (itags.has('breakfast-warm-meal') || item.recipe_type === 'breakfast') catMap.get('warm')!.items.push(item);
            else if (itags.has('breakfast-drink') || item.recipe_type === 'drink') catMap.get('drink')!.items.push(item);
            else if (item.ingredient_id && !item.recipe_id) catMap.get('extra')!.items.push(item);
            else catMap.get('other')!.items.push(item);
          }

          const rendered: React.ReactNode[] = [];

          for (const cat of categories) {
            if (cat.items.length === 0) continue;
            rendered.push(
              <div key={cat.key} className="pl-7 py-1">
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${mealColors.bg} ${mealColors.text} border-b`}>
                    {cat.label}
                  </div>
                  {cat.items.map((item) => {
                    const isIngredient = !item.recipe_id && item.ingredient_id;
                    const itemViolations = scanData?.violations.filter(
                      (v) => v.meal_id === meal.id && v.recipe_id === item.recipe_id
                    ) || [];
                    const itemAllergenTags = itemViolations.map((v) => v.nutritional_tag);
                    const displayName = isIngredient ? item.ingredient_name : item.recipe_title;

                    return (
                      <div key={item.id} className="px-3 py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.recipe_id && item.recipe_slug ? (
                                <Link to={`/recipes/${item.recipe_slug}`} className="text-sm hover:text-primary transition-colors truncate block font-medium">
                                  {displayName}
                                </Link>
                              ) : item.ingredient_id ? (
                                <Link to={`/ingredients/${item.ingredient_slug}`} className="text-sm hover:text-primary transition-colors truncate block font-medium">
                                  {displayName}
                                </Link>
                              ) : (
                                <span className="text-sm truncate block font-medium">{displayName}</span>
                              )}
                              <NutriTagBadge allergenTags={itemAllergenTags} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                            {item.energy_kcal != null && (
                              <span>{Math.round(item.energy_kcal / effPortions)} kcal</span>
                            )}
                            {isIngredient && !meal.is_synced && isPortionUnit(item.measuring_unit_name) ? (
                              <>
                                {onUpdateItemQuantity ? (
                                  <QuantityInput value={item.quantity ?? 0} onChange={(q) => onUpdateItemQuantity(item.id, q)} />
                                ) : (
                                  <FactorInput value={item.factor} onChange={(f) => onUpdateItemFactor(item.id, f)} />
                                )}
                                <span>
                                  {item.measuring_unit_name}
                                  {item.quantity_g != null && <span className="text-muted-foreground/60 ml-0.5">({Math.round(item.quantity_g)}g)</span>}
                                </span>
                              </>
                            ) : isIngredient && !meal.is_synced ? (
                              <span className="text-xs">{Math.round(item.quantity_g ?? 0)}g</span>
                            ) : isIngredient && isPortionUnit(item.measuring_unit_name) ? (
                              <span>&times;{item.quantity?.toFixed(2).replace('.', ',')} {item.measuring_unit_name}</span>
                            ) : isIngredient ? (
                              <span className="text-xs">{Math.round(item.quantity_g ?? 0)}g</span>
                            ) : (
                              <>
                                {canEdit && !meal.is_synced ? (
                                  <FactorInput value={item.factor} onChange={(f) => onUpdateItemFactor(item.id, f)} />
                                ) : (
                                  item.factor !== 1.0 && <span>&times;{item.factor.toFixed(2).replace('.', ',')}</span>
                                )}
                              </>
                            )}
                          </div>
                          {canEdit && !meal.is_synced && (
                            <button onClick={() => onDeleteItem(item.id)} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Entfernen">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Sum row per category */}
                  {cat.items.length > 0 && (() => {
                    if (cat.key === 'base') {
                      const sum = cat.items.reduce((s, it) => s + (it.quantity ?? 0), 0);
                      const kcal = cat.items.reduce((s, it) => s + (it.energy_kcal ?? 0) / effPortions, 0);
                      const unit = cat.items.find((it) => it.measuring_unit_name)?.measuring_unit_name || 'Scheibe';
                      return <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-xs font-medium"><span>Brote gesamt</span><span className="text-muted-foreground">&times;{sum.toFixed(2).replace('.', ',')} {unit} · {Math.round(kcal)} kcal</span></div>;
                    }
                    if (cat.key === 'topping') {
                      const sum = cat.items.reduce((s, it) => s + (it.quantity ?? 0), 0);
                      const kcal = cat.items.reduce((s, it) => s + (it.energy_kcal ?? 0) / effPortions, 0);
                      const unit = cat.items.find((it) => it.measuring_unit_name)?.measuring_unit_name || 'Portion';
                      return <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-xs font-medium"><span>Belag gesamt</span><span className="text-muted-foreground">&times;{sum.toFixed(2).replace('.', ',')} {unit} · {Math.round(kcal)} kcal</span></div>;
                    }
                    if (cat.key === 'warm') {
                      const kcal = cat.items.reduce((s, it) => s + (it.energy_kcal ?? 0) / effPortions, 0);
                      return <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-xs font-medium"><span>Warme Gerichte gesamt</span><span className="text-muted-foreground">{Math.round(kcal)} kcal</span></div>;
                    }
                    if (cat.key === 'drink') {
                      const sum = cat.items.reduce((s, it) => s + (it.quantity ?? 0), 0);
                      const kcal = cat.items.reduce((s, it) => s + (it.energy_kcal ?? 0) / effPortions, 0);
                      const unit = cat.items.find((it) => it.measuring_unit_name)?.measuring_unit_name || 'Tasse';
                      return <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-xs font-medium"><span>Getränke gesamt</span><span className="text-muted-foreground">&times;{sum.toFixed(2).replace('.', ',')} {unit} · {Math.round(kcal)} kcal</span></div>;
                    }
                    if (cat.key === 'extra') {
                      const kcal = cat.items.reduce((s, it) => s + (it.energy_kcal ?? 0) / effPortions, 0);
                      return <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-xs font-medium"><span>Extras gesamt</span><span className="text-muted-foreground">{Math.round(kcal)} kcal</span></div>;
                    }
                    const kcal = cat.items.reduce((s, it) => s + (it.energy_kcal ?? 0) / effPortions, 0);
                    return <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-xs font-medium"><span>Weitere gesamt</span><span className="text-muted-foreground">{Math.round(kcal)} kcal</span></div>;
                  })()}
                </div>
              </div>
            );
          }

          return rendered;
        })()}

      {/* Recipe Search Dialog */}
      <RecipeSearchDialog
        mealType={meal.meal_type}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={(recipeId) => handleSelect(recipeId)}
        onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity, _ingredientName) => {
          onAddIngredient(meal.id, ingredientId, portionId, measuringUnitId, quantity);
          setDialogOpen(false);
        }}
        nutritionalTagIds={nutritionalTagIds}
        nutritionalTagNames={nutritionalTagNames}
        excludedRecipeIds={excludedRecipeIds}
        excludedIngredientIds={excludedIngredientIds}
        planId={mealPlanId}
        mealId={meal.id}
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
