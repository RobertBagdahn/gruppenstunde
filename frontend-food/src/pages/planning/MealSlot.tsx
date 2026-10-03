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
  ChevronDown,
  ChevronUp,
  Users,
  LayoutGrid,
  TriangleAlert,
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
import { BuffetBuilder } from '@/components/buffet/BuffetBuilder';
import { mealTargetLabel } from '@/lib/mealTargetLabel';
import { tagDisplayName } from '@/lib/tagLabels';
import { BUFFET_ROLE_ORDER, buffetRoleName, itemBuffetRole } from '@/lib/buffetRoles';
import RecipePreviewDialog from './RecipePreviewDialog';
import { FactorInput } from './FactorInput';
import { PortionPersonsInput } from '@/components/planning/PortionPersonsInput';
import { QuantityInput } from './QuantityInput';
import { MealActionsMenu } from '@/components/planning/MealActionsMenu';
import RecipeThumbnail from '@/components/recipe/RecipeThumbnail';
import { formatCount, formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

export function MealSlot({
  meal,
  canEdit,
  normPortions,
  budgetPerPersonPerDay,
  siblingMeals,
  onDeleteMeal,
  onAddRecipe,
  onAddIngredient,
  onActivate,
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
  /** Reports the slot the user last interacted with (target of the Cmd+K shortcut). */
  onActivate?: (mealId: number) => void;
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
  const [showBuffetBuilder, setShowBuffetBuilder] = useState(false);
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
          // Buffet roles are shown as groups below; as header badges they would repeat.
          if ((BUFFET_ROLE_ORDER as readonly string[]).includes(t)) continue;
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
    setShowBuffetBuilder(true);
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
  const coverageColorClass = coverage.status === 'good' ? 'text-primary font-semibold' : coverage.status === 'warning' ? 'text-warning font-semibold' : 'text-destructive font-bold';

  const mealTargetKcal = Math.round(NORM_PERSON_DAILY_KCAL * meal.day_part_factor);
  const mealActualKcal = Math.round(meal.total_energy_kcal / effPortions);
  // Soll-Erfüllungsgrad der Mahlzeit (Ist gegen Mahlzeit-Soll), getrennt vom Tagesanteil.
  const fulfillmentPercent = coverage.percent;
  const mealTargetCost = budgetPerPersonPerDay ? budgetPerPersonPerDay * meal.day_part_factor : 0;
  const mealActualCost = meal.total_cost_eur / effPortions;
  const mealTime = formatMealTime(meal.start_datetime);
  const targetLabel = mealTargetLabel(meal);
  const mealIsTooLittle = meal.meal_type !== 'drinks' && coverage.percent < 80;
  const mealIsTooExpensive = mealTargetCost > 0 && mealActualCost > mealTargetCost;
  const mealIsUnhealthy = meal.items.some((item) => (item.nutri_class ?? 0) >= 4);

  const isPortionUnit = (name: string) => !['g', 'ml'].includes(name.toLowerCase());
  const formatPortion = (item: Meal['items'][number]): string => {
    if (isPortionUnit(item.measuring_unit_name) && item.quantity != null) {
      return `×${formatNumber(item.quantity, { maxDecimals: 2 }).replace('.', ',')} ${item.measuring_unit_name}`;
    }
    if (item.quantity_g != null) return `${Math.round(item.quantity_g)}g`;
    return 'Menge nicht angegeben';
  };

  const renderMealItemCard = (it: Meal['items'][number]): React.ReactNode => {
    const isIng = !it.recipe_id && it.ingredient_id;
    const viol = (scanData?.violations.filter((v) => v.meal_id === meal.id && v.recipe_id === it.recipe_id) || []);
    const allTags = viol.map((v) => v.nutritional_tag);
    const dName = isIng ? it.ingredient_name : it.recipe_title;
    return (
      <div key={it.id} className="pl-7 py-1">
        <div className={`rounded-lg p-3 border ${mealColors.bg} ${mealColors.border}/30 group ${meal.is_synced ? 'text-muted-foreground' : ''}`}>
          <div className="flex items-start gap-3">
            {it.recipe_id && <RecipeThumbnail imageUrl={it.image_url} title={dName} size="xs" imgClassName="rounded-lg" className="rounded-lg" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {it.recipe_id && it.recipe_slug ? <Link to={`/recipes/${it.recipe_slug}`} className="text-emphasis hover:text-primary transition-colors truncate block font-medium">{dName}</Link>
                  : it.ingredient_id ? <Link to={`/ingredients/${it.ingredient_slug}`} className="text-emphasis hover:text-primary transition-colors truncate block font-medium">{dName}</Link>
                  : <span className="text-emphasis truncate block font-medium">{dName}</span>}
                {isIng && <span className="text-caption px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">Zutat</span>}
                <NutriTagBadge allergenTags={allTags} />
                {it.warnings.length > 0 && (
                  <span title={it.warnings.map((w) => w.message).join(' ')} className="inline-flex shrink-0">
                    <TriangleAlert className="w-3.5 h-3.5 text-destructive" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-body text-muted-foreground flex-wrap">
                {it.energy_kcal != null && <span>{Math.round(it.energy_kcal / effPortions)} kcal</span>}
                {it.cost_eur != null && <span>{formatNumber((it.cost_eur / effPortions), { maxDecimals: 2 })} €</span>}
                {isIng && !meal.is_synced && isPortionUnit(it.measuring_unit_name) ? (
                  // NEW format: portion-based, editable
                  <>
                    {onUpdateItemQuantity ? <QuantityInput value={it.quantity ?? 0} onChange={(q) => onUpdateItemQuantity(it.id, q)} /> : <FactorInput value={it.factor} onChange={(f) => onUpdateItemFactor(it.id, f)} />}
                    <span className="text-caption text-muted-foreground">{it.measuring_unit_name}{it.quantity_g != null ? <span className="text-muted-foreground/60 ml-0.5">({Math.round(it.quantity_g)}g)</span> : ''}</span>
                  </>
                ) : isIng && !meal.is_synced ? (
                  <span className={`text-caption ${it.has_missing_weight ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {formatPortion(it)}
                  </span>
                ) : isIng && isPortionUnit(it.measuring_unit_name) ? (
                   // Portion-based, read-only fallback
                    <span>{formatPortion(it)}</span>
                 ) : isIng ? (
                   // Raw unit, read-only fallback
                    <span className="text-caption">{formatPortion(it)}</span>
                 ) : canEdit && !meal.is_synced ? <FactorInput value={it.factor} onChange={(f) => onUpdateItemFactor(it.id, f)} /> : (it.factor !== 1.0 && <span>&times;{formatNumber(it.factor, { maxDecimals: 2 }).replace('.', ',')}</span>)}
              </div>
            </div>
            {canEdit && !meal.is_synced && <button onClick={() => onDeleteItem(it.id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>}
          </div>
        </div>
      </div>
    );
  };

  if (isEmpty && !meal.is_external) {
    return (
      <div
        className={`p-4 rounded-xl border-2 border-dashed ${mealColors.border}/40 bg-card/60 hover:bg-muted/30 transition-all space-y-3`}
        onClickCapture={() => onActivate?.(meal.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name={MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant'} size={20} className={mealColors.text} />
            <span className="font-bold text-body text-foreground">
              {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
            </span>
            {mealTime && <span className="text-caption text-muted-foreground">· {mealTime}</span>}
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
              onOpenBuffetBuilder={handleOpenWizard}
            />
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <p className="text-caption text-muted-foreground italic flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-warning/80 shrink-0" />
            Noch kein Gericht geplant
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Gericht hinzufügen
                </button>
                {meal.meal_type !== 'drinks' && (
                  <button
                    type="button"
                    onClick={handleOpenWizard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold border border-warning-border bg-warning-soft text-warning hover:bg-warning-soft transition-all"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Buffet zusammenstellen
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRandomSuggest}
                  disabled={randomQuery.isFetching}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-caption font-semibold border border-border bg-card hover:bg-muted/60 transition-all disabled:opacity-50"
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
          targetLabel={targetLabel}
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
        {meal.meal_type !== 'drinks' && (
          <BuffetBuilder
            open={showBuffetBuilder}
            onOpenChange={setShowBuffetBuilder}
            mealPlanId={mealPlanId}
            mealId={meal.id}
            mealType={meal.meal_type}
            normPortions={effPortions}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${mealColors.border}/40 bg-card shadow-soft overflow-hidden transition-all`}
      onClickCapture={() => onActivate?.(meal.id)}
    >
      {/* Compact Card Header */}
      <div
        className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none hover:bg-muted/20 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-lg bg-muted/60 shrink-0 mt-0.5">
            <Icon name={MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant'} size={20} className={mealColors.text} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
                {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
              </span>
              {mealTime && <span className="text-caption text-muted-foreground">· {mealTime}</span>}
              {meal.is_synced && (
                <span className="inline-flex items-center gap-1 text-caption font-semibold text-primary">
                  <RefreshCw className="w-3 h-3 animate-spin-slow" />
                  Referenz
                </span>
              )}
            </div>
            <h4 className="text-emphasis font-display font-bold text-foreground truncate mt-0.5">
              {primaryTitle || 'Mahlzeit'}
            </h4>

            {/* Quick Metrics & Tags */}
            <div className="flex items-center gap-2 mt-2 flex-wrap text-caption">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted font-semibold text-muted-foreground">
                <Users className="w-3 h-3" />
                {effPortions} P.
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {formatNumber(mealActualCost, { maxDecimals: 2 })} €/P. ({formatNumber(meal.total_cost_eur, { maxDecimals: 2 })} €)
              </span>
              {meal.price_coverage != null && meal.price_coverage.missing_ingredients > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-warning-border bg-warning-soft text-warning text-caption font-bold"
                  title={`${meal.price_coverage.priced_ingredients} von ${meal.price_coverage.total_ingredients} Zutaten haben einen bestätigten Preis${meal.price_coverage.affected_items.length ? `; betroffen: ${meal.price_coverage.affected_items.map((item) => String(item.ingredient_name ?? '')).filter(Boolean).join(', ')}` : ''}`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {meal.price_coverage.missing_ingredients} {meal.price_coverage.missing_ingredients === 1 ? 'Zutat' : 'Zutaten'} ohne Preis
                </span>
              )}
              {mealIsTooLittle && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-caption font-bold ${
                    coverage.status === 'critical'
                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                      : 'bg-warning-soft text-warning border-warning-border'
                  }`}
                  title={`Nur ${coverage.percent}% der erwarteten Energiemenge (${formatCount(mealActualKcal)} von ${formatCount(mealTargetKcal)} kcal)`}
                >
                  <AlertCircle className="w-3 h-3" />
                  Zu wenig Energie ({coverage.percent} %)
                </span>
              )}
              {mealIsTooExpensive && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/20 bg-destructive/10 text-destructive text-caption font-bold"
                  title={`Ist ${formatNumber(mealActualCost, { maxDecimals: 2 })} € pro Person, Soll ${formatNumber(mealTargetCost, { maxDecimals: 2 })} € pro Person`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Zu teuer
                </span>
              )}
              {mealIsUnhealthy && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/20 bg-destructive/10 text-destructive text-caption font-bold"
                  title="Diese Mahlzeit enthält ein Rezept oder eine Zutat mit Nutri-Score D oder E"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Ungesund
                </span>
              )}
              {prominentIngredientTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground text-caption"
                >
                  {tagDisplayName(tag)}
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
            onOpenBuffetBuilder={handleOpenWizard}
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
            <div className="text-caption text-muted-foreground italic flex items-center gap-1 bg-card p-2 rounded-xl border border-border/40">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>{meal.note}</span>
            </div>
          )}

          {/* Meal Soll/Ist stats */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            {meal.meal_type !== 'drinks' && (
              <span
                className="inline-flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border/40"
                title={!mealIsTooLittle ? 'Energie ok' : undefined}
              >
                <Icon name="local_fire_department" size={16} />
                <span>Kcal: Soll {formatCount(mealTargetKcal)} / <span className={`${coverageColorClass} font-medium`}>Ist {formatCount(mealActualKcal)} kcal</span> ({fulfillmentPercent}%)</span>
              </span>
            )}
            {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
              <span className="inline-flex items-center gap-1 bg-card px-2.5 py-1 rounded-xl border border-border/40">
                <Icon name="payments" size={16} />
                <span>Preis: Soll {formatNumber(mealTargetCost, { maxDecimals: 2 })} € / Ist {formatNumber(mealActualCost, { maxDecimals: 2 })} €</span>
              </span>
            )}
          </div>

          {/* Meal Items Rendering */}
          <div className="space-y-2">

        {(() => {
          const hasBuffetItems = meal.items.some((it) => it.factor >= 0.01 && itemBuffetRole(it) !== null);

          if (!hasBuffetItems) {
            // No buffet roles involved: existing single-card rendering
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
              out.push(renderMealItemCard(it));
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
                      {first.recipe_id && <RecipeThumbnail imageUrl={first.image_url} title={first.recipe_title} size="xs" imgClassName="rounded-lg" className="rounded-lg" />}
                      <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 flex-wrap">{first.recipe_id && first.recipe_slug ? <Link to={`/recipes/${first.recipe_slug}`} className="text-emphasis hover:text-primary transition-colors truncate block font-medium">{first.recipe_title}</Link> : <span className="text-emphasis truncate block font-medium">{first.recipe_title}</span>}<NutriTagBadge allergenTags={allTags} /></div></div>
                    </div>
                    <div className="space-y-1">
                      {variants.map((v) => (
                        <div key={v.id} className="flex items-center gap-2 ml-6 py-0.5 group">
                          <span className="text-body text-muted-foreground flex-1">{v.display_name || v.recipe_title}</span>
                          <div className="flex items-center gap-2 text-body text-muted-foreground">
                            {v.energy_kcal != null && <span>{Math.round(v.energy_kcal / effPortions)} kcal</span>}
                            {canEdit && !meal.is_synced ? <FactorInput value={v.factor} onChange={(f) => onUpdateItemFactor(v.id, f)} /> : <span className="text-caption">&times;{formatNumber(v.factor, { maxDecimals: 2 }).replace('.', ',')}</span>}
                          </div>
                          {canEdit && !meal.is_synced && <button onClick={() => onDeleteItem(v.id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return out;
          }

          // Buffet: group by role (item.buffet_role, else the first role tag), in role order.
          // Items without a role appear individually in "Weitere".
          const roleGroups = new Map<string, typeof meal.items>();
          const otherItems: typeof meal.items = [];
          for (const item of meal.items) {
            if (item.factor < 0.01) continue;
            const role = itemBuffetRole(item);
            if (role) {
              const list = roleGroups.get(role) ?? [];
              list.push(item);
              roleGroups.set(role, list);
            } else {
              otherItems.push(item);
            }
          }

          const rendered: React.ReactNode[] = [];

          for (const role of BUFFET_ROLE_ORDER) {
            const items = roleGroups.get(role);
            if (!items || items.length === 0) continue;
            const kcalSum = items.reduce((s, it) => s + (it.energy_kcal ?? 0) / effPortions, 0);
            const units = new Set(items.map((it) => it.measuring_unit_name).filter(Boolean));
            const quantitySum = units.size === 1 && items.every((it) => it.quantity != null)
              ? items.reduce((s, it) => s + (it.quantity ?? 0), 0)
              : null;
            const quantityUnit = units.size === 1 ? [...units][0] : '';

            rendered.push(
              <div key={role} className="pl-7 py-1" data-testid={`buffet-role-group-${role}`}>
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className={`px-3 py-1.5 text-caption font-semibold uppercase tracking-wider ${mealColors.bg} ${mealColors.text} border-b`}>
                    {buffetRoleName(role)}
                  </div>
                  {items.map((item) => {
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
                                <Link to={`/recipes/${item.recipe_slug}`} className="text-body hover:text-primary transition-colors truncate block font-medium">
                                  {displayName}
                                </Link>
                              ) : item.ingredient_id ? (
                                <Link to={`/ingredients/${item.ingredient_slug}`} className="text-body hover:text-primary transition-colors truncate block font-medium">
                                  {displayName}
                                </Link>
                              ) : (
                                <span className="text-body truncate block font-medium">{displayName}</span>
                              )}
                              <NutriTagBadge allergenTags={itemAllergenTags} />
                              {item.warnings.length > 0 && (
                                <span title={item.warnings.map((w) => w.message).join(' ')} className="inline-flex shrink-0">
                                  <TriangleAlert className="w-3.5 h-3.5 text-destructive" />
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-caption text-muted-foreground shrink-0">
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
                              <span className="text-caption">{Math.round(item.quantity_g ?? 0)}g</span>
                            ) : isIngredient && isPortionUnit(item.measuring_unit_name) ? (
                               <span>{formatPortion(item)}</span>
                            ) : isIngredient ? (
                               <span className="text-caption">{formatPortion(item)}</span>
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
                                    <span className="text-caption font-semibold px-2 py-0.5 rounded-lg bg-muted">
                                      {Math.round(item.factor * (item.recipe_portions || 4))} P.
                                    </span>
                                  )
                                )}
                              </>
                            )}
                          </div>
                          {canEdit && !meal.is_synced && (
                            <button onClick={() => onDeleteItem(item.id)} className="p-0.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Entfernen">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center justify-between text-caption font-medium">
                    <span>{buffetRoleName(role)} gesamt</span>
                    <span className="text-muted-foreground">
                      {quantitySum != null && `\u00d7${formatNumber(quantitySum, { maxDecimals: 2 }).replace('.', ',')} ${quantityUnit} \u00b7 `}
                      {Math.round(kcalSum)} kcal
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Items without a role: individual cards, same style as the non-buffet rendering.
          for (const item of otherItems) {
            rendered.push(renderMealItemCard(item));
          }

          return rendered;
        })()}
          </div>

          {canEdit && !meal.is_synced && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Weiteres Gericht oder Zutat hinzufügen
              </button>
              {meal.meal_type !== 'drinks' && (
                <button
                  type="button"
                  onClick={handleOpenWizard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold border border-warning-border text-warning hover:bg-warning-soft transition-colors"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Im Buffet-Builder bearbeiten
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
        targetLabel={targetLabel}
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

      {/* Buffet Builder */}
      {meal.meal_type !== 'drinks' && (
        <BuffetBuilder
          open={showBuffetBuilder}
          onOpenChange={setShowBuffetBuilder}
          mealPlanId={mealPlanId}
          mealId={meal.id}
          mealType={meal.meal_type}
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
