import { useMemo } from 'react';
import { CalendarDays, ClipboardCheck, Gauge, ListPlus, RefreshCw } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useScaleMealToTarget } from '@/api/mealPlans';
import type { BreakfastCatalog, BreakfastPortion } from '@/schemas/breakfast';
import type { Meal } from '@/schemas/mealPlan';
import {
  computeGroupKcal,
  breadItemGrams,
  toppingItemGrams,
  energyTargetKcal,
  drinkKcalFromRecipes,
  extrasKcalPerPerson,
  extraIngredientsKcal,
  warmDishKcalFromRecipes,
  FAT_GRAMS_PER_PERSON,
  type RecipeEnergyData,
} from '@/lib/breakfastCalc';
import { formatGramsWithPortionHint } from '@/lib/portionQuantityHint';
import { formatNumber } from '@/lib/format';
import { notify } from '@/lib/notify';
import WizardSectionHeading from '../wizard/WizardSectionHeading';
import { BREAKFAST_CARD_CLASS, BREAKFAST_CHIP_CLASS } from './breakfastStyles';

interface StepCockpitProps {
  wiz: UseWizardStateReturn;
  catalog?: BreakfastCatalog;
  dayPartFactor: number;
  saveMode: 'refMeal' | 'directMeal';
  planId: number;
  mealId: number | null;
  breakfastMeals: Meal[];
  selectedBreakfastMealIds: number[];
  onSelectedBreakfastMealIdsChange: (ids: number[]) => void;
  manualItemCount: number;
  manualItemsPolicy: 'preserve' | 'replace';
  onManualItemsPolicyChange: (policy: 'preserve' | 'replace') => void;
}

function kcalRow(kcal: number): string {
  return kcal > 0 ? `${Math.round(kcal)} kcal` : '—';
}

function gramsRow(g: number, portions?: BreakfastPortion[] | null): string {
  if (g <= 0) return '—';
  return formatGramsWithPortionHint(g, portions);
}

export default function StepCockpit({
  wiz,
  catalog,
  dayPartFactor,
  saveMode,
  planId,
  mealId,
  breakfastMeals,
  selectedBreakfastMealIds,
  onSelectedBreakfastMealIdsChange,
  manualItemCount,
  manualItemsPolicy,
  onManualItemsPolicyChange,
}: StepCockpitProps) {
  const { state } = wiz;
  const scaleMutation = useScaleMealToTarget(planId);

  const drinkRecipeDataMap = useMemo(() => {
    const map = new Map<number, RecipeEnergyData>();
    for (const r of catalog?.drink_recipes ?? []) {
      map.set(r.id, { cached_energy_total_kcal: r.cached_energy_total_kcal, cached_weight_g: r.cached_weight_g, portions: 1 });
    }
    return map;
  }, [catalog?.drink_recipes]);

  const warmDishDataMap = useMemo(() => {
    const map = new Map<number, RecipeEnergyData>();
    for (const r of catalog?.warm_meal_recipes ?? []) {
      map.set(r.id, { cached_energy_total_kcal: r.cached_energy_total_kcal, cached_weight_g: r.cached_weight_g, portions: 1 });
    }
    return map;
  }, [catalog?.warm_meal_recipes]);

  // kcal/100 g of every catalog ingredient; freely searched extras outside the catalog stay unknown.
  const catalogKcal100gById = useMemo(() => {
    const map = new Map<number, number>();
    const groups = [
      catalog?.extra_ingredients,
      catalog?.topping_ingredients,
      catalog?.base_ingredients,
      catalog?.fat_ingredients,
    ];
    for (const group of groups) {
      for (const ing of group ?? []) {
        if (ing.energy_kcal != null && ing.energy_kcal > 0 && !map.has(ing.id)) map.set(ing.id, ing.energy_kcal);
      }
    }
    return map;
  }, [catalog]);

  const extraIngredientKcalById = new Map<number, number>();
  for (const [ingId, grams] of Object.entries(state.extraIngredients)) {
    const kcal100g = catalogKcal100gById.get(Number(ingId));
    if (grams > 0 && kcal100g != null) extraIngredientKcalById.set(Number(ingId), (kcal100g / 100) * grams);
  }

  // Warm dishes reserve their kcal from the bread/topping budget.
  const warmKcal = warmDishKcalFromRecipes(state, warmDishDataMap);
  const fixKcal = extrasKcalPerPerson(state, warmDishDataMap);
  const { breadKcal, fatKcal, toppingKcal, toppingBudgetKcal } = computeGroupKcal(state.basis, state.toppings, state.fatSelections, state.gramsPerPerson, dayPartFactor, fixKcal);
  const extraIngredientsTotalKcal = extraIngredientsKcal(extraIngredientKcalById);

  const hasActiveBasis = state.basis.some((item) => item.sharePercent > 0);
  const basisTotalShare = state.basis.reduce((s, b) => s + b.sharePercent, 0);
  const toppingTotalShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);

  const drinksKcal = drinkKcalFromRecipes(state, drinkRecipeDataMap);
  // Sum of the food rows in the summary table; drinks are listed separately below it.
  const foodKcal = breadKcal + fatKcal + toppingKcal + fixKcal + extraIngredientsTotalKcal;
  const totalKcal = foodKcal + drinksKcal;
  const target = energyTargetKcal(dayPartFactor);
  const coverage = target > 0 ? totalKcal / target : 0;

  const hasDrinks = state.drinkRecipes.some((d) => d.sharePercent > 0 && d.recipeId > 0);
  const barWidth = Math.min(100, Math.round(coverage * 100));
  // Dreistufige Ampel: <80% rot, 80-110% grün, 110-120% gelb, >120% rot
  const barColor =
    coverage < 0.8 ? 'bg-destructive'
    : coverage <= 1.1 ? 'bg-primary'
    : coverage <= 1.2 ? 'bg-warning-bright'
    : 'bg-destructive';
  const showOverplanWarning = coverage > 1.2;

  const hasExtras = state.warmDishRecipeIds.length > 0 || Object.values(state.extraIngredients).some((g) => g > 0);

  async function handleNormalize() {
    if (saveMode === 'directMeal' && mealId != null) {
      try {
        await scaleMutation.mutateAsync(mealId);
        notify.success('Auf Soll skaliert');
      } catch (error) {
        notify.error('Skalierung fehlgeschlagen', { error: error });
      }
    }
  }

  return (
    <div className="space-y-5">
      {saveMode === 'directMeal' && breakfastMeals.length > 0 && (
        <div className={BREAKFAST_CARD_CLASS}>
          <WizardSectionHeading icon={<CalendarDays className="h-5 w-5" />}>Auf welche Frühstücke anwenden?</WizardSectionHeading>
          <div className="-mt-2 space-y-3">
            <p className="text-caption text-muted-foreground">Die geprüfte Zusammenstellung wird auf jedes ausgewählte Frühstück dieses Events kopiert.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onSelectedBreakfastMealIdsChange(breakfastMeals.map((meal) => meal.id))} className={BREAKFAST_CHIP_CLASS}>Alle Frühstücke</button>
              <button type="button" onClick={() => onSelectedBreakfastMealIdsChange(mealId ? [mealId] : [])} className={BREAKFAST_CHIP_CLASS}>Nur dieses</button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {breakfastMeals.map((meal) => {
              const selected = selectedBreakfastMealIds.includes(meal.id);
              const label = meal.start_datetime ? new Date(meal.start_datetime).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : `Frühstück #${meal.id}`;
              return (
                <label key={meal.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-card px-3 text-body font-medium">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary"
                    checked={selected}
                    onChange={() => onSelectedBreakfastMealIdsChange(selected ? selectedBreakfastMealIds.filter((id) => id !== meal.id) : [...selectedBreakfastMealIds, meal.id])}
                  />
                  {label}
                </label>
              );
            })}
          </div>
          {selectedBreakfastMealIds.length === 0 && <p className="text-caption text-destructive">Bitte mindestens ein Frühstück auswählen.</p>}
        </div>
      )}
      {saveMode === 'directMeal' && manualItemCount > 0 && (
        <fieldset className={BREAKFAST_CARD_CLASS}>
          <WizardSectionHeading icon={<ListPlus className="h-5 w-5" />}>Vorhandene manuelle Einträge</WizardSectionHeading>
          <p className="-mt-2 text-caption text-muted-foreground">
            Für die ausgewählten Frühstücke gibt es {manualItemCount} eigene Einträge außerhalb des Assistenten.
          </p>
          <label className="flex min-h-11 items-center gap-3 text-body">
            <input
              type="radio"
              className="h-5 w-5 accent-primary"
              name="manual-items-policy"
              value="preserve"
              checked={manualItemsPolicy === 'preserve'}
              onChange={() => onManualItemsPolicyChange('preserve')}
            />
            <span>Eigene Einträge beibehalten</span>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-body">
            <input
              type="radio"
              className="h-5 w-5 accent-primary"
              name="manual-items-policy"
              value="replace"
              checked={manualItemsPolicy === 'replace'}
              onChange={() => onManualItemsPolicyChange('replace')}
            />
            <span>Alle bisherigen Einträge durch dieses Frühstück ersetzen</span>
          </label>
        </fieldset>
      )}
      {!hasActiveBasis && (
        <p className="rounded-xl bg-warning-soft p-4 text-body text-warning" role="status">
          Nährwertsummen sind ohne ausgewählte Basis-Zutat nicht verfügbar.
        </p>
      )}
      {/* SollIstBar */}
      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<Gauge className="h-5 w-5" />}>Energie-Check</WizardSectionHeading>
        {saveMode === 'directMeal' && (
          <div className="-mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleNormalize}
              disabled={scaleMutation.isPending}
              className={BREAKFAST_CHIP_CLASS}
              title="Alle Mengen auf das Soll skalieren"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Normalisieren
            </button>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex justify-between text-body">
            <span className="text-muted-foreground" data-testid="cockpit-ist-kcal">Ist: {hasActiveBasis ? `${Math.round(totalKcal)} kcal/Person` : '—'}</span>
            <span className="text-muted-foreground">Soll: {Math.round(target)} kcal/Person</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <p className="text-right text-caption text-muted-foreground">
            {hasActiveBasis ? `${Math.round(coverage * 100)}% des Tagesziels` : 'Nährwertdaten unvollständig'} (× {dayPartFactor} Faktor)
            {hasDrinks && drinksKcal > 0 && ` · inkl. Getränke: +${Math.round(drinksKcal)} kcal`}
          </p>
        </div>
      </div>

      {/* Warnung bei Überplanung > 120% */}
      {showOverplanWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft px-4 py-3">
          <div className="flex-1">
            <p className="text-body font-medium text-warning">
              Zu viele Kalorien ({Math.round(coverage * 100)}%)
            </p>
            {saveMode === 'directMeal' && (
              <p className="mt-1 text-caption text-warning">
                Mit 'Normalisieren' auf das Soll von {Math.round(target)} kcal/Person anpassen.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Transparenz-Tabelle */}
      <div className="overflow-hidden rounded-xl bg-card shadow-card">
        <div className="px-5 pt-5">
          <WizardSectionHeading icon={<ClipboardCheck className="h-5 w-5" />}>Zusammenfassung</WizardSectionHeading>
        </div>
        <div className="divide-y divide-border text-body">
          <div className="grid grid-cols-2 px-5 py-2 text-caption font-medium text-muted-foreground sm:grid-cols-4">
            <span>Position</span>
            <span className="text-right">Menge/P</span>
            <span className="text-right">kcal/P</span>
            <span className="text-right">Anteil</span>
          </div>

          {/* ── Brot ── */}
          {state.basis.filter((b) => b.sharePercent > 0).length > 0 && (
            <div className="bg-muted px-5 py-2 text-caption font-medium text-muted-foreground">Brot</div>
          )}
          {state.basis.filter((b) => b.sharePercent > 0).map((b) => {
            const grams = breadItemGrams(b.sharePercent, basisTotalShare, breadKcal, b.energyKcal100g);
            const kcal = b.energyKcal100g ? (b.energyKcal100g / 100) * grams : 0;
            const catalogIng = catalog?.base_ingredients.find((ing) => ing.id === b.ingredientId);
            return (
              <div key={b.ingredientId} className="grid grid-cols-2 px-5 py-2 sm:grid-cols-4">
                <span className="truncate">{b.name}</span>
                <span className="text-right">{gramsRow(grams, catalogIng?.portions)}</span>
                <span className="text-right" data-testid="cockpit-item-kcal">{kcalRow(kcal)}</span>
                <span className="text-right">{foodKcal > 0 ? `${Math.round(kcal / foodKcal * 100)}%` : '—'}</span>
              </div>
            );
          })}
          {state.basis.filter((b) => b.sharePercent > 0).length > 0 && (() => {
            const totalGramsBasis = state.basis.reduce((s, b) =>
              s + breadItemGrams(b.sharePercent, basisTotalShare, breadKcal, b.energyKcal100g), 0);
            const totalKcalBasis = state.basis.reduce((s, b) => {
              const g = breadItemGrams(b.sharePercent, basisTotalShare, breadKcal, b.energyKcal100g);
              return s + (b.energyKcal100g ? (b.energyKcal100g / 100) * g : 0);
            }, 0);
            return (
              <div className="grid grid-cols-2 bg-muted/60 px-5 py-2 text-caption font-semibold sm:grid-cols-4">
                <span>Brote gesamt</span>
                <span className="text-right">{gramsRow(totalGramsBasis)}</span>
                <span className="text-right">{kcalRow(totalKcalBasis)}</span>
                <span className="text-right">{foodKcal > 0 ? `${Math.round(totalKcalBasis / foodKcal * 100)}%` : '—'}</span>
              </div>
            );
          })()}

          {/* ── Belag ── */}
          {state.toppings.filter((t) => t.sharePercent > 0).length > 0 && (
            <div className="bg-muted px-5 py-2 text-caption font-medium text-muted-foreground">Belag</div>
          )}
          {state.toppings.filter((t) => t.sharePercent > 0).map((t) => {
            const grams = toppingItemGrams(t.sharePercent, toppingTotalShare, toppingBudgetKcal, t.energyKcal100g);
            const kcal = t.energyKcal100g ? (t.energyKcal100g / 100) * grams : 0;
            return (
              <div key={t.ingredientId} className="grid grid-cols-2 px-5 py-2 sm:grid-cols-4">
                <span className="truncate">{t.name}</span>
                <span className="text-right">{gramsRow(grams, t.portions)}</span>
                <span className="text-right" data-testid="cockpit-item-kcal">{kcalRow(kcal)}</span>
                <span className="text-right">{foodKcal > 0 ? `${Math.round(kcal / foodKcal * 100)}%` : '—'}</span>
              </div>
            );
          })}
          {state.toppings.filter((t) => t.sharePercent > 0).length > 0 && (() => {
            const totalGramsTopping = state.toppings.reduce((s, t) =>
              s + toppingItemGrams(t.sharePercent, toppingTotalShare, toppingBudgetKcal, t.energyKcal100g), 0);
            const totalKcalTopping = state.toppings.reduce((s, t) => {
              const g = toppingItemGrams(t.sharePercent, toppingTotalShare, toppingBudgetKcal, t.energyKcal100g);
              return s + (t.energyKcal100g ? (t.energyKcal100g / 100) * g : 0);
            }, 0);
            return (
              <div className="grid grid-cols-2 bg-muted/60 px-5 py-2 text-caption font-semibold sm:grid-cols-4">
                <span>Belag gesamt</span>
                <span className="text-right">{gramsRow(totalGramsTopping)}</span>
                <span className="text-right">{kcalRow(totalKcalTopping)}</span>
                <span className="text-right">{foodKcal > 0 ? `${Math.round(totalKcalTopping / foodKcal * 100)}%` : '—'}</span>
              </div>
            );
          })()}

          {/* ── Streichfett ── */}
          {state.fatSelections.filter((f) => f.sharePercent > 0 && f.ingredientId > 0).length > 0 && (
            <div className="bg-muted px-5 py-2 text-caption font-medium text-muted-foreground">Streichfett</div>
          )}
          {state.fatSelections.filter((f) => f.sharePercent > 0 && f.ingredientId > 0).map((f) => {
            const grams = (f.sharePercent / 100) * FAT_GRAMS_PER_PERSON;
            const kcal = f.energyKcal100g ? (f.energyKcal100g / 100) * grams : 0;
            return (
              <div key={`fat-${f.ingredientId}`} className="grid grid-cols-2 px-5 py-2 sm:grid-cols-4">
                <span className="truncate">{f.name}</span>
                <span className="text-right">{gramsRow(grams)}</span>
                <span className="text-right" data-testid="cockpit-item-kcal">{kcalRow(kcal)}</span>
                <span className="text-right">{foodKcal > 0 ? `${Math.round(kcal / foodKcal * 100)}%` : '—'}</span>
              </div>
            );
          })}
          {state.fatSelections.filter((f) => f.sharePercent > 0 && f.ingredientId > 0).length > 0 && (() => {
            const totalGramsFat = state.fatSelections.reduce((s, f) => {
              if (f.ingredientId === 0) return s;
              return s + (f.sharePercent / 100) * FAT_GRAMS_PER_PERSON;
            }, 0);
            const totalKcalFat = state.fatSelections.reduce((s, f) => {
              if (f.ingredientId === 0 || !f.energyKcal100g) return s;
              const g = (f.sharePercent / 100) * FAT_GRAMS_PER_PERSON;
              return s + (f.energyKcal100g / 100) * g;
            }, 0);
            return (
              <div className="grid grid-cols-2 bg-muted/60 px-5 py-2 text-caption font-semibold sm:grid-cols-4">
                <span>Streichfett gesamt</span>
                <span className="text-right">{gramsRow(totalGramsFat)}</span>
                <span className="text-right">{kcalRow(totalKcalFat)}</span>
                <span className="text-right">{foodKcal > 0 ? `${Math.round(totalKcalFat / foodKcal * 100)}%` : '—'}</span>
              </div>
            );
          })()}

          {/* ── Warme Gerichte & Extras ── */}
          {hasExtras && (
            <div className="bg-muted px-5 py-2 text-caption font-medium text-muted-foreground">Warme Gerichte & Extras</div>
          )}
          {state.warmDishRecipeIds.map((recipeId) => {
            const recipe = catalog?.warm_meal_recipes.find((r) => r.id === recipeId);
            const factor = state.warmDishFactors[String(recipeId)] ?? 1;
            const name = state.warmDishRecipeNames[String(recipeId)] || recipe?.title;
            const itemKcal = recipe?.cached_energy_total_kcal ? recipe.cached_energy_total_kcal * factor : 0;
            return (
            <div key={`warm-${recipeId}`} className="grid grid-cols-2 px-5 py-2 sm:grid-cols-4">
              <span className="truncate">{name || `Rezept #${recipeId}`}</span>
              <span className="text-right">&times;{factor}</span>
              <span className="text-right" data-testid="cockpit-item-kcal">{kcalRow(itemKcal)}</span>
              <span className="text-right">{foodKcal > 0 && itemKcal > 0 ? `${Math.round((itemKcal / foodKcal) * 100)}%` : '—'}</span>
            </div>
            );
          })}
          {warmKcal > 0 && state.warmDishRecipeIds.length > 0 && (
            <div className="grid grid-cols-2 bg-muted/60 px-5 py-2 text-caption font-semibold sm:grid-cols-4">
              <span>Warme Gerichte gesamt</span>
              <span className="text-right">—</span>
              <span className="text-right">{kcalRow(warmKcal)}</span>
              <span className="text-right">{foodKcal > 0 ? `${Math.round((warmKcal / foodKcal) * 100)}%` : '—'}</span>
            </div>
          )}
          {Object.entries(state.extraIngredients)
            .filter(([, g]) => g > 0)
            .map(([ingId, grams]) => {
              const selection = state.extraIngredientSelections[ingId];
              const kcal = extraIngredientKcalById.get(Number(ingId)) ?? 0;
              return (
              <div key={`extra-${ingId}`} className="grid grid-cols-2 px-5 py-2 sm:grid-cols-4">
                <span className="truncate">{state.extraIngredientNames[ingId] ?? `Zutat #${ingId}`}</span>
                <span className="text-right">{selection ? `${formatNumber(selection.quantity, { maxDecimals: 2 })} ${selection.portionName}` : gramsRow(grams)}</span>
                <span className="text-right" data-testid="cockpit-item-kcal">{kcalRow(kcal)}</span>
                <span className="text-right">{foodKcal > 0 && kcal > 0 ? `${Math.round((kcal / foodKcal) * 100)}%` : '—'}</span>
              </div>
              );
            })}

          {/* ── Total (Brot + Streichfett + Belag + Extras) ── */}
          <div className="grid grid-cols-2 bg-primary-soft px-5 py-2 font-semibold text-primary-dark sm:grid-cols-4">
            <span>Gesamt (Brot + Streichfett + Belag + Extras)</span>
            <span className="text-right">—</span>
            <span className="text-right" data-testid="cockpit-food-total-kcal">{hasActiveBasis ? kcalRow(foodKcal) : '—'}</span>
            <span className="text-right">100%</span>
          </div>

          {/* ── Getränke ── */}
          {hasDrinks && (
            <div>
              <div className="bg-muted px-5 py-2 text-caption font-medium text-muted-foreground">
                Getränke
              </div>
              {state.drinkRecipes.filter((d) => d.sharePercent > 0 && d.recipeId > 0).map((drink) => {
                const kcal = drink.energyKcal ?? 0;
                return (
                  <div key={`drink-${drink.recipeId}`} className="grid grid-cols-2 px-5 py-2 sm:grid-cols-4">
                    <span className="truncate">{drink.name}</span>
                    <span className="text-right">{drink.sharePercent}%</span>
                    <span className="text-right">{Math.round(kcal)}</span>
                    <span className="text-right">—</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-2 bg-muted/60 px-5 py-2 font-semibold sm:grid-cols-4">
                <span>Getränke gesamt</span>
                <span className="text-right">—</span>
                <span className="text-right">{Math.round(drinksKcal)}</span>
                <span className="text-right">—</span>
              </div>
            </div>
          )}

          {/* ── Milch & Säfte section */}
          {state.drinkIngredients.some((d) => d.sharePercent > 0 && d.ingredientId > 0) && (
            <div>
              <div className="bg-muted px-5 py-2 text-caption font-medium text-muted-foreground">
                Milch & Säfte
              </div>
              {state.drinkIngredients.filter((d) => d.sharePercent > 0 && d.ingredientId > 0).map((ingredient) => {
                const ml = ingredient.mlPerPerson ?? 0;
                return (
                  <div key={`milk-${ingredient.ingredientId}`} className="grid grid-cols-2 px-5 py-2 sm:grid-cols-4">
                    <span className="truncate">{ingredient.name}</span>
                    <span className="text-right">{ml}ml</span>
                    <span className="text-right">—</span>
                    <span className="text-right">—</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-2 bg-muted/60 px-5 py-2 font-semibold sm:grid-cols-4">
                <span>Milch & Säfte gesamt</span>
                <span className="text-right">{state.drinkIngredients.filter((d) => d.sharePercent > 0 && d.ingredientId > 0).reduce((sum, d) => sum + (d.mlPerPerson ?? 0), 0)}ml</span>
                <span className="text-right">—</span>
                <span className="text-right">—</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
