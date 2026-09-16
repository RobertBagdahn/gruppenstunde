import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  PlusCircle,
  X,
  RefreshCw,
  FileText,
  Shuffle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Users,
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
import { MealOmnibarDialog } from '@/components/planning/MealOmnibarDialog';
import { BreakfastQuickBuilder } from '@/components/breakfast/BreakfastQuickBuilder';
import RecipePreviewDialog from './RecipePreviewDialog';
import { FactorInput } from './FactorInput';
import { PortionPersonsInput } from '@/components/planning/PortionPersonsInput';
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
  nutritionalTagNames: _nutritionalTagNames,
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
  const { data: scanData } = useIngredientScan(mealPlanId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [randomPreviewRecipe, setRandomPreviewRecipe] = useState<RecipeSearchResult | null>(null);
  const [showQuickBuilder, setShowQuickBuilder] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const primaryTitle = useMemo(() => {
    if (meal.display_name) return meal.display_name;
    const recipeTitles = meal.items.filter((i) => Boolean(i.recipe_title)).map((i) => i.recipe_title);
    if (recipeTitles.length > 0) return recipeTitles.join(', ');
    const ingNames = meal.items.filter((i) => Boolean(i.ingredient_name)).map((i) => i.ingredient_name);
    if (ingNames.length > 0) return ingNames.join(', ');
    return '';
  }, [meal.display_name, meal.items]);

  const prominentIngredientTags = useMemo(() => {
    const tags: string[] = [];
    for (const item of meal.items) {
      if (item.ingredient_tags && item.ingredient_tags.length > 0) {
        for (const t of item.ingredient_tags) {
          if (!tags.includes(t) && tags.length < 4) tags.push(t);
        }
      } else if (item.ingredient_name && !tags.includes(item.ingredient_name) && tags.length < 4) {
        tags.push(item.ingredient_name);
      }
    }
    return tags;
  }, [meal.items]);

  const excludedRecipeIds = useMemo(
    () => new Set(meal.items.filter((i) => i.recipe_id != null).map((i) => i.recipe_id!)),
    [meal.items],
  );
  const excludedIngredientIds = useMemo(
    () => new Set(meal.items.filter((i) => i.ingredient_id != null).map((i) => i.ingredient_id!)),
    [meal.items],
  );

  const handleOpenWizard = () => {
    setShowQuickBuilder(true);
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
          image_url: s.image_url,
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
  const mealIsTooLittle = meal.meal_type !== 'drinks' && coverage.percent < 80;
  const mealIsTooExpensive = mealTargetCost > 0 && mealActualCost > mealTargetCost;
  const mealIsUnhealthy = meal.items.some((item) => (item.nutri_class ?? 0) >= 4);

  const isPortionUnit = (name: string) => !['g', 'ml'].includes(name.toLowerCase());
  const formatPortion = (item: Meal['items'][number]): string => {
    if (item.portion_display) {
      return `${item.portion_display}${item.is_per_norm_person ? ' / Person' : ''}`;
    }
    if (isPortionUnit(item.measuring_unit_name) && item.quantity != null) {
      return `×${item.quantity.toFixed(2).replace('.', ',')} ${item.measuring_unit_name}`;
    }
    if (item.quantity_g != null) return `${Math.round(item.quantity_g)}g`;
    return 'Menge nicht angegeben';
  };

  if (isEmpty && !meal.is_external) {
    return (
      <div className={`p-4 rounded-xl border-2 border-dashed ${mealColors.border}/40 bg-card/60 hover:bg-muted/30 transition-all space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-[20px] ${mealColors.text}`}>
              {MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant'}
            </span>
            <span className="font-bold text-sm text-foreground">
              {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
            </span>
            {mealTime && <span className="text-xs text-muted-foreground">· {mealTime}</span>}
          </div>
          {canEdit && (
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
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500/80 shrink-0" />
            Noch kein Gericht geplant
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Gericht hinzufügen
                </button>
                {meal.meal_type === 'breakfast' && (
                  <button
                    type="button"
                    onClick={handleOpenWizard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-chart-4/30 bg-chart-4/10 text-chart-4 hover:bg-chart-4/20 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Frühstücksbaukasten
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRandomSuggest}
                  disabled={randomQuery.isFetching}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted/60 transition-all disabled:opacity-50"
                  title="Schneller KI-Vorschlag"
                >
                  <Shuffle className="w-3.5 h-3.5 text-primary" />
                  Was passt hier?
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <MealOmnibarDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mealType={meal.meal_type}
          mealId={meal.id}
          normPortions={effPortions}
          onSelectRecipe={handleSelect}
          onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity) => {
            onAddIngredient(meal.id, ingredientId, portionId, measuringUnitId, quantity);
            setDialogOpen(false);
          }}
          nutritionalTagIds={nutritionalTagIds}
          excludedRecipeIds={excludedRecipeIds}
          excludedIngredientIds={excludedIngredientIds}
        />
        {randomPreviewRecipe && (
          <RecipePreviewDialog
            recipe={randomPreviewRecipe}
            open={!!randomPreviewRecipe}
            onOpenChange={(op) => { if (!op) setRandomPreviewRecipe(null); }}
            onConfirm={(recId) => {
              handleSelect(recId);
              setRandomPreviewRecipe(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${mealColors.border}/40 bg-card shadow-soft overflow-hidden transition-all`}>
      {/* Compact Card Header */}
      <div
        className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none hover:bg-muted/20 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-lg bg-muted/60 shrink-0 mt-0.5">
            <span className={`material-symbols-outlined text-[20px] ${mealColors.text}`}>
              {MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
              </span>
              {mealTime && <span className="text-xs text-muted-foreground">· {mealTime}</span>}
              {meal.is_synced && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <RefreshCw className="w-3 h-3 animate-spin-slow" />
                  Referenz
                </span>
              )}
            </div>
            <h4 className="text-base font-display font-bold text-foreground truncate mt-0.5">
              {primaryTitle || 'Mahlzeit'}
            </h4>

            {/* Quick Metrics & Tags */}
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted font-semibold text-muted-foreground">
                <Users className="w-3 h-3" />
                {effPortions} P.
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {mealActualCost.toFixed(2)} €/P. ({meal.total_cost_eur.toFixed(2)} €)
              </span>
              {meal.price_coverage != null && meal.price_coverage.missing_ingredients > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[hsl(var(--chart-4))]/30 bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] text-[11px] font-bold"
                  title={`${meal.price_coverage.priced_ingredients} von ${meal.price_coverage.total_ingredients} Zutaten haben einen bestätigten Preis${meal.price_coverage.affected_items.length ? `; betroffen: ${meal.price_coverage.affected_items.map((item) => String(item.ingredient_name ?? '')).filter(Boolean).join(', ')}` : ''}`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {meal.price_coverage.missing_ingredients} {meal.price_coverage.missing_ingredients === 1 ? 'Zutat' : 'Zutaten'} ohne Preis
                </span>
              )}
              {mealIsTooLittle && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                    coverage.status === 'critical'
                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                      : 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/20'
                  }`}
                  title={`Nur ${coverage.percent}% der erwarteten Energiemenge (${mealActualKcal} von ${mealTargetKcal} kcal)`}
                >
                  <AlertCircle className="w-3 h-3" />
                  Essen reicht nicht
                </span>
              )}
              {mealIsTooExpensive && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/20 bg-destructive/10 text-destructive text-[11px] font-bold"
                  title={`Ist ${mealActualCost.toFixed(2)} € pro Person, Soll ${mealTargetCost.toFixed(2)} € pro Person`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Zu teuer
                </span>
              )}
              {mealIsUnhealthy && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/20 bg-destructive/10 text-destructive text-[11px] font-bold"
                  title="Diese Mahlzeit enthält ein Rezept oder eine Zutat mit Nutri-Score D oder E"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Ungesund
                </span>
              )}
              {prominentIngredientTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground text-[11px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 self-start" onClick={(e) => e.stopPropagation()}>
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={isOpen ? 'Details einklappen' : 'Details aufklappen'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-border/60 p-4 space-y-4 bg-muted/10 animate-in fade-in-50 duration-200">
          {/* Meal Note */}
          {meal.note && (
            <div className="text-xs text-muted-foreground italic flex items-center gap-1 bg-card p-2 rounded-lg border border-border/40">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>{meal.note}</span>
            </div>
          )}

          {/* Meal Soll/Ist stats */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {meal.meal_type !== 'drinks' && (
              <span className="inline-flex items-center gap-1 bg-card px-2.5 py-1 rounded-lg border border-border/40">
                <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                <span>Kcal: Soll {mealTargetKcal} / <span className={`${coverageColorClass} font-medium`}>Ist {mealActualKcal} kcal</span> ({fulfillmentPercent}%)</span>
              </span>
            )}
            {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
              <span className="inline-flex items-center gap-1 bg-card px-2.5 py-1 rounded-lg border border-border/40">
                <span className="material-symbols-outlined text-[14px]">payments</span>
                <span>Preis: Soll {mealTargetCost.toFixed(2)} € / Ist {mealActualCost.toFixed(2)} €</span>
              </span>
            )}
          </div>

          {/* Meal Items Rendering */}
          <div className="space-y-2">

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
                            <span className={`text-xs ${it.has_missing_weight ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {formatPortion(it)}
                            </span>
                          ) : isIng && it.portion_display ? (
                             // portion_display from backend (read-only)
                              <span className={`text-xs ${it.has_missing_weight ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {formatPortion(it)}
                             </span>
                           ) : isIng && isPortionUnit(it.measuring_unit_name) ? (
                             // Portion-based, read-only fallback
                              <span>{formatPortion(it)}</span>
                           ) : isIng ? (
                             // Raw unit, read-only fallback
                              <span className="text-xs">{formatPortion(it)}</span>
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
                               <span>{formatPortion(item)}</span>
                            ) : isIngredient ? (
                               <span className="text-xs">{formatPortion(item)}</span>
                            ) : (
                              <>
                                {canEdit && !meal.is_synced ? (
                                  <PortionPersonsInput
                                    factor={item.factor}
                                    basePortions={item.recipe_portions || 4}
                                    onChangeFactor={(f: number) => onUpdateItemFactor(item.id, f)}
                                  />
                                ) : (
                                  item.factor !== 1.0 && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                                      {Math.round(item.factor * (item.recipe_portions || 4))} P.
                                    </span>
                                  )
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
                      const unit = cat.items.find((it) => it.measuring_unit_name)?.measuring_unit_name || 'Gramm';
                      return <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-xs font-medium"><span>Brote gesamt</span><span className="text-muted-foreground">&times;{sum.toFixed(2).replace('.', ',')} {unit} · {Math.round(kcal)} kcal</span></div>;
                    }
                    if (cat.key === 'topping') {
                      const sum = cat.items.reduce((s, it) => s + (it.quantity ?? 0), 0);
                      const kcal = cat.items.reduce((s, it) => s + (it.energy_kcal ?? 0) / effPortions, 0);
                      const unit = cat.items.find((it) => it.measuring_unit_name)?.measuring_unit_name || 'Gramm';
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
          </div>

          {canEdit && !meal.is_synced && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Weiteres Gericht oder Zutat hinzufügen
              </button>
              {meal.meal_type === 'breakfast' && (
                <button
                  type="button"
                  onClick={handleOpenWizard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-chart-4/30 text-chart-4 hover:bg-chart-4/5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Im Frühstücksbaukasten bearbeiten
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Unified Meal Omnibar Dialog */}
      <MealOmnibarDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mealType={meal.meal_type}
        mealId={meal.id}
        normPortions={effPortions}
        onSelectRecipe={(recipeId) => handleSelect(recipeId)}
        onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity) => {
          onAddIngredient(meal.id, ingredientId, portionId, measuringUnitId, quantity);
          setDialogOpen(false);
        }}
        nutritionalTagIds={nutritionalTagIds}
        excludedRecipeIds={excludedRecipeIds}
        excludedIngredientIds={excludedIngredientIds}
      />

      {/* Breakfast Quick Builder */}
      {meal.meal_type === 'breakfast' && (
        <BreakfastQuickBuilder
          open={showQuickBuilder}
          onOpenChange={setShowQuickBuilder}
          mealPlanId={mealPlanId}
          mealId={meal.id}
          normPortions={effPortions}
        />
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
