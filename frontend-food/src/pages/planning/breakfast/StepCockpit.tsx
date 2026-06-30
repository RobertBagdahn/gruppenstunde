import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useScaleMealToTarget } from '@/api/mealPlans';
import type { BreakfastCatalog } from '@/schemas/breakfast';
import {
  computeGroupKcal,
  breadItemGrams,
  toppingItemGrams,
  energyTargetKcal,
  drinkKcalFromRecipes,
  extrasKcalPerPerson,
  warmDishKcalFromRecipes,
  type RecipeEnergyData,
} from '@/lib/breakfastCalc';
import { toast } from 'sonner';

interface StepCockpitProps {
  wiz: UseWizardStateReturn;
  catalog?: BreakfastCatalog;
  dayPartFactor: number;
  saveMode: 'refMeal' | 'directMeal';
  planId: number;
  mealId: number | null;
}

function kcalRow(kcal: number): string {
  return kcal > 0 ? `${Math.round(kcal)} kcal` : '—';
}

function gramsRow(g: number): string {
  return g > 0 ? `${Math.round(g)}g` : '—';
}

export default function StepCockpit({ wiz, catalog, dayPartFactor, saveMode, planId, mealId }: StepCockpitProps) {
  const { state } = wiz;
  const scaleMutation = useScaleMealToTarget(planId);

  const drinkRecipeDataMap = useMemo(() => {
    const map = new Map<number, RecipeEnergyData>();
    for (const r of catalog?.drink_recipes ?? []) {
      map.set(r.id, { cached_energy_kcal: r.cached_energy_kcal, portions: 1 });
    }
    return map;
  }, [catalog?.drink_recipes]);

  const warmDishDataMap = useMemo(() => {
    const map = new Map<number, RecipeEnergyData>();
    for (const r of catalog?.warm_meal_recipes ?? []) {
      map.set(r.id, { cached_energy_kcal: r.cached_energy_kcal, portions: 1 });
    }
    return map;
  }, [catalog?.warm_meal_recipes]);

  // Extras kcal: warme Gerichte (aus Katalog-Cache) — extra ingredients via Backend-Hook
  const warmKcal = warmDishKcalFromRecipes(state, warmDishDataMap);
  const fixKcal = extrasKcalPerPerson(state, warmDishDataMap);
  const { breadKcal, toppingKcal } = computeGroupKcal(state.basis, state.toppings, dayPartFactor, fixKcal);

  const basisTotalShare = state.basis.reduce((s, b) => s + b.sharePercent, 0);
  const toppingTotalShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);

  const drinksKcal = drinkKcalFromRecipes(state, drinkRecipeDataMap);
  const totalKcal = breadKcal + toppingKcal + fixKcal + drinksKcal;
  const target = energyTargetKcal(dayPartFactor);
  const coverage = target > 0 ? totalKcal / target : 0;

  const hasDrinks = state.drinkRecipeIds.length > 0;
  const barWidth = Math.min(100, Math.round(coverage * 100));
  // Dreistufige Ampel: <80% rot, 80-110% grün, 110-120% gelb, >120% rot
  const barColor =
    coverage < 0.8 ? 'bg-destructive'
    : coverage <= 1.1 ? 'bg-primary'
    : coverage <= 1.2 ? 'bg-amber-400'
    : 'bg-destructive';
  const showOverplanWarning = coverage > 1.2;

  const hasExtras = state.warmDishRecipeIds.length > 0 || Object.values(state.extraIngredients).some((g) => g > 0);

  async function handleNormalize() {
    if (saveMode === 'directMeal' && mealId != null) {
      try {
        await scaleMutation.mutateAsync(mealId);
        toast.success('Auf Soll skaliert');
      } catch {
        toast.error('Skalierung fehlgeschlagen');
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* SollIstBar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-base">Energie-Check</h3>
          {saveMode === 'directMeal' && (
            <button
              type="button"
              onClick={handleNormalize}
              disabled={scaleMutation.isPending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors disabled:opacity-40"
              title="Alle Mengen auf das Soll skalieren"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Normalisieren
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ist: {Math.round(totalKcal)} kcal/Person</span>
            <span className="text-muted-foreground">Soll: {Math.round(target)} kcal/Person</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(coverage * 100)}% des Tagesziels (× {dayPartFactor} Faktor)
            {hasDrinks && drinksKcal > 0 && ` · inkl. Getränke: +${Math.round(drinksKcal)} kcal`}
          </p>
        </div>
      </div>

      {/* Warnung bei Überplanung > 120% */}
      {showOverplanWarning && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Zu viele Kalorien ({Math.round(coverage * 100)}%)
            </p>
            {saveMode === 'directMeal' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Mit 'Normalisieren' auf das Soll von {Math.round(target)} kcal/Person anpassen.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Transparenz-Tabelle */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-base">Zusammenfassung</h3>
        </div>
        <div className="divide-y divide-border text-sm">
          <div className="grid grid-cols-4 px-4 py-2 text-xs text-muted-foreground font-medium">
            <span>Position</span>
            <span className="text-right">Menge/P</span>
            <span className="text-right">kcal/P</span>
            <span className="text-right">Anteil</span>
          </div>

          {/* ── Brot ── */}
          {state.basis.filter((b) => b.sharePercent > 0).length > 0 && (
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium bg-muted/20">Brot</div>
          )}
          {state.basis.filter((b) => b.sharePercent > 0).map((b) => {
            const grams = breadItemGrams(b.sharePercent, basisTotalShare, breadKcal, b.energyKcal100g);
            const kcal = b.energyKcal100g ? (b.energyKcal100g / 100) * grams : 0;
            return (
              <div key={b.ingredientId} className="grid grid-cols-4 px-4 py-2">
                <span className="truncate">{b.name}</span>
                <span className="text-right">{gramsRow(grams)}</span>
                <span className="text-right">{kcalRow(kcal)}</span>
                <span className="text-right">{totalKcal > 0 ? `${Math.round(kcal / totalKcal * 100)}%` : '—'}</span>
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
              <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/30 text-xs">
                <span>Brote gesamt</span>
                <span className="text-right">{gramsRow(totalGramsBasis)}</span>
                <span className="text-right">{kcalRow(totalKcalBasis)}</span>
                <span className="text-right">{totalKcal > 0 ? `${Math.round(totalKcalBasis / totalKcal * 100)}%` : '—'}</span>
              </div>
            );
          })()}

          {/* ── Belag ── */}
          {state.toppings.filter((t) => t.sharePercent > 0).length > 0 && (
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium bg-muted/20">Belag</div>
          )}
          {state.toppings.filter((t) => t.sharePercent > 0).map((t) => {
            const grams = toppingItemGrams(t.sharePercent, toppingTotalShare, toppingKcal, t.energyKcal100g);
            const kcal = t.energyKcal100g ? (t.energyKcal100g / 100) * grams : 0;
            return (
              <div key={t.ingredientId} className="grid grid-cols-4 px-4 py-2">
                <span className="truncate">{t.name}</span>
                <span className="text-right">{gramsRow(grams)}</span>
                <span className="text-right">{kcalRow(kcal)}</span>
                <span className="text-right">{totalKcal > 0 ? `${Math.round(kcal / totalKcal * 100)}%` : '—'}</span>
              </div>
            );
          })}
          {state.toppings.filter((t) => t.sharePercent > 0).length > 0 && (() => {
            const totalGramsTopping = state.toppings.reduce((s, t) =>
              s + toppingItemGrams(t.sharePercent, toppingTotalShare, toppingKcal, t.energyKcal100g), 0);
            const totalKcalTopping = state.toppings.reduce((s, t) => {
              const g = toppingItemGrams(t.sharePercent, toppingTotalShare, toppingKcal, t.energyKcal100g);
              return s + (t.energyKcal100g ? (t.energyKcal100g / 100) * g : 0);
            }, 0);
            return (
              <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/30 text-xs">
                <span>Belag gesamt</span>
                <span className="text-right">{gramsRow(totalGramsTopping)}</span>
                <span className="text-right">{kcalRow(totalKcalTopping)}</span>
                <span className="text-right">{totalKcal > 0 ? `${Math.round(totalKcalTopping / totalKcal * 100)}%` : '—'}</span>
              </div>
            );
          })()}

          {/* ── Warme Gerichte & Extras ── */}
          {hasExtras && (
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium bg-muted/20">Warme Gerichte & Extras</div>
          )}
          {state.warmDishRecipeIds.map((recipeId) => {
            const recipe = catalog?.warm_meal_recipes.find((r) => r.id === recipeId);
            const factor = state.warmDishFactors[String(recipeId)] ?? 1;
            const name = state.warmDishRecipeNames[String(recipeId)] || recipe?.title;
            const itemKcal = recipe?.cached_energy_kcal ? recipe.cached_energy_kcal * factor : 0;
            return (
            <div key={`warm-${recipeId}`} className="grid grid-cols-4 px-4 py-2">
              <span className="truncate">{name || `Rezept #${recipeId}`}</span>
              <span className="text-right">&times;{factor}</span>
              <span className="text-right">{itemKcal > 0 ? `${Math.round(itemKcal)} kcal` : '—'}</span>
              <span className="text-right">{totalKcal > 0 && itemKcal > 0 ? `${Math.round((itemKcal / totalKcal) * 100)}%` : '—'}</span>
            </div>
            );
          })}
          {warmKcal > 0 && state.warmDishRecipeIds.length > 0 && (
            <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/30 text-xs">
              <span>Warme Gerichte gesamt</span>
              <span className="text-right">—</span>
              <span className="text-right">{kcalRow(warmKcal)}</span>
              <span className="text-right">{totalKcal > 0 ? `${Math.round((warmKcal / totalKcal) * 100)}%` : '—'}</span>
            </div>
          )}
          {Object.entries(state.extraIngredients)
            .filter(([, g]) => g > 0)
            .map(([ingId, grams]) => (
              <div key={`extra-${ingId}`} className="grid grid-cols-4 px-4 py-2">
                <span className="truncate">{state.extraIngredientNames[ingId] ?? `Zutat #${ingId}`}</span>
                <span className="text-right">{gramsRow(grams)}</span>
                <span className="text-right text-muted-foreground text-xs">kcal wird geladen…</span>
                <span className="text-right">—</span>
              </div>
            ))}

          {/* ── Total (Brot + Belag + Extras) ── */}
          <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/30">
            <span>Gesamt (Brot + Belag + Extras)</span>
            <span className="text-right">—</span>
            <span className="text-right">{kcalRow(totalKcal)}</span>
            <span className="text-right">100%</span>
          </div>

          {/* ── Getränke ── */}
          {hasDrinks && (
            <div className="border-t border-border">
              <div className="px-4 py-2 text-xs text-muted-foreground font-medium bg-muted/20">
                Getränke
              </div>
              {state.drinkRecipeIds.map((recipeId) => {
                const recipe = catalog?.drink_recipes.find((r) => r.id === recipeId);
                const factor = state.drinkFactors[String(recipeId)] ?? 1.0;
                const name = state.drinkRecipeNames[String(recipeId)] || recipe?.title || `Rezept #${recipeId}`;
                const kcal = recipe?.cached_energy_kcal ? recipe.cached_energy_kcal * factor : null;
                return (
                  <div key={`drink-${recipeId}`} className="grid grid-cols-4 px-4 py-2">
                    <span className="truncate">{name}</span>
                    <span className="text-right">&times;{factor}</span>
                    <span className="text-right">{kcal != null ? Math.round(kcal) : '—'}</span>
                    <span className="text-right">—</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/20">
                <span>Getränke gesamt</span>
                <span className="text-right">—</span>
                <span className="text-right">{Math.round(drinksKcal)}</span>
                <span className="text-right">—</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
