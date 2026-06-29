import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastLeftovers } from '@/api/breakfast';
import type { BreakfastCatalog } from '@/schemas/breakfast';
import {
  toppingGramsPerPerson,
  normalizeBePerPerson,
  energyTargetKcal,
  totalKcalPerPerson,
  drinksKcalPerPerson,
  extrasKcalPerPerson,
  totalMilkMlPerPerson,
} from '@/lib/breakfastCalc';

interface StepCockpitProps {
  wiz: UseWizardStateReturn;
  catalog?: BreakfastCatalog;
  normPortions: number;
  days: number;
  dayPartFactor: number;
}

export default function StepCockpit({ wiz, catalog, normPortions, days, dayPartFactor }: StepCockpitProps) {
  const { state, setBePerPerson } = wiz;
  const leftovers = useBreakfastLeftovers();

  const drinksKcal = drinksKcalPerPerson(state.drinks);
  const extrasKcal = extrasKcalPerPerson(state);
  const totalKcal = totalKcalPerPerson(state);
  const target = energyTargetKcal(dayPartFactor);
  const coverage = target > 0 ? totalKcal / target : 0;

  const totalMl = state.drinks.mlPerPerson;
  const coffeeMl = Math.round(totalMl * (state.drinks.coffeePercent / 100));
  const cocoaMl = Math.round(totalMl * (state.drinks.cocoaPercent / 100));
  const teaMl = Math.round(totalMl * (state.drinks.teaPercent / 100));
  const milkMl = Math.round(totalMilkMlPerPerson(state.drinks));
  const hasDrinks = coffeeMl > 0 || cocoaMl > 0 || teaMl > 0 || milkMl > 0;
  const hasExtras = state.warmDishRecipeIds.length > 0 || Object.values(state.extraIngredients).some((g) => g > 0);

  useEffect(() => {
    if (state.toppings.length === 0) return;
    const toppingPayload = state.toppings
      .filter((t) => t.sharePercent > 0)
      .map((t) => ({
        ingredient_id: t.ingredientId,
        grams_per_person: toppingGramsPerPerson(
          state.bePerPerson, t, state.globalIntensity, state.toppings
        ),
      }));
    if (toppingPayload.length === 0) return;
    leftovers.mutate({ toppings: toppingPayload, norm_portions: normPortions, days });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bePerPerson, state.toppings, state.globalIntensity, normPortions, days]);

  function handleNormalize() {
    const newBe = normalizeBePerPerson(state, dayPartFactor, extrasKcal);
    setBePerPerson(newBe);
  }

  const barWidth = Math.min(100, Math.round(coverage * 100));
  const barColor = coverage < 0.8 ? 'bg-amber-400' : coverage <= 1.1 ? 'bg-primary' : 'bg-destructive';
  const showOverplanWarning = coverage > 1.2;

  return (
    <div className="space-y-6">
      {/* SollIstBar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-base">Energie-Check (Brot + Belag + Extras)</h3>
          <button
            type="button"
            onClick={handleNormalize}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
            title="BE automatisch auf Soll skalieren"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Normalisieren
          </button>
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
            {hasDrinks && ` · Getränke: +${Math.round(drinksKcal)} kcal extra`}
          </p>
        </div>
      </div>

      {/* Warnung bei Überplanung > 120% */}
      {showOverplanWarning && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Zu viele Kalorien ({Math.round(coverage * 100)}%)
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Mit 'Normalisieren' auf das Soll von {Math.round(target)} kcal/Person anpassen.
            </p>
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
            <span className="text-right">Portion</span>
            <span className="text-right">kcal/P</span>
            <span className="text-right">Anteil</span>
          </div>

          {/* ── Brot ── */}
          <div className="px-4 py-2 text-xs text-muted-foreground font-medium bg-muted/20">Brot</div>
          {state.basis.filter((b) => b.sharePercent > 0).map((b) => {
            const portions = state.bePerPerson * (b.sharePercent / 100);
            const g = b.sliceWeightG * portions;
            const kcal = b.energyKcal100g ? (b.energyKcal100g / 100) * g : 0;
            return (
              <div key={b.ingredientId} className="grid grid-cols-4 px-4 py-2">
                <span className="truncate">{b.name}</span>
                <span className="text-right">&times;{portions.toFixed(2).replace('.', ',')} Scheibe</span>
                <span className="text-right">{Math.round(kcal)}</span>
                <span className="text-right">{totalKcal > 0 ? Math.round(kcal / totalKcal * 100) : 0}%</span>
              </div>
            );
          })}
          {state.basis.filter((b) => b.sharePercent > 0).length > 0 && (() => {
            const totalPortions = state.basis.reduce((s, b) => s + state.bePerPerson * (b.sharePercent / 100), 0);
            const totalKcalBasis = state.basis.reduce((s, b) => {
              const p = state.bePerPerson * (b.sharePercent / 100);
              const g = b.sliceWeightG * p;
              return s + (b.energyKcal100g ? (b.energyKcal100g / 100) * g : 0);
            }, 0);
            return (
              <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/30 text-xs">
                <span>Brote gesamt</span>
                <span className="text-right">&times;{totalPortions.toFixed(2).replace('.', ',')} Scheibe</span>
                <span className="text-right">{Math.round(totalKcalBasis)}</span>
                <span className="text-right">{totalKcal > 0 ? Math.round(totalKcalBasis / totalKcal * 100) : 0}%</span>
              </div>
            );
          })()}

          {/* ── Belag ── */}
          <div className="px-4 py-2 text-xs text-muted-foreground font-medium bg-muted/20">Belag</div>
          {(() => {
            const totalToppingShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);
            return state.toppings.filter((t) => t.sharePercent > 0).map((t) => {
              const portionCount = totalToppingShare > 0 ? state.bePerPerson * (t.sharePercent / totalToppingShare) : 0;
              const g = toppingGramsPerPerson(state.bePerPerson, t, state.globalIntensity, state.toppings);
              const kcal = t.energyKcal100g ? (t.energyKcal100g / 100) * g : 0;
              return (
                <div key={t.ingredientId} className="grid grid-cols-4 px-4 py-2">
                  <span className="truncate">{t.name}</span>
                  <span className="text-right">&times;{portionCount.toFixed(2).replace('.', ',')} Portion</span>
                  <span className="text-right">{Math.round(kcal)}</span>
                  <span className="text-right">{totalKcal > 0 ? Math.round(kcal / totalKcal * 100) : 0}%</span>
                </div>
              );
            });
          })()}
          {state.toppings.filter((t) => t.sharePercent > 0).length > 0 && (() => {
            const totalToppingShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);
            const totalPortions = totalToppingShare > 0 ? state.toppings.reduce((s, t) => s + state.bePerPerson * (t.sharePercent / totalToppingShare), 0) : 0;
            const totalKcalTopping = state.toppings.reduce((s, t) => {
              const g = toppingGramsPerPerson(state.bePerPerson, t, state.globalIntensity, state.toppings);
              return s + (t.energyKcal100g ? (t.energyKcal100g / 100) * g : 0);
            }, 0);
            return (
              <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/30 text-xs">
                <span>Belag gesamt</span>
                <span className="text-right">&times;{totalPortions.toFixed(2).replace('.', ',')} Portion</span>
                <span className="text-right">{Math.round(totalKcalTopping)}</span>
                <span className="text-right">{totalKcal > 0 ? Math.round(totalKcalTopping / totalKcal * 100) : 0}%</span>
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
            return (
            <div key={`warm-${recipeId}`} className="grid grid-cols-4 px-4 py-2">
              <span className="truncate">{name || `Rezept #${recipeId}`}</span>
              <span className="text-right">&times;{factor}</span>
              <span className="text-right">{recipe?.cached_energy_kcal ? Math.round(recipe.cached_energy_kcal * factor) : '—'}</span>
              <span className="text-right">{totalKcal > 0 && recipe?.cached_energy_kcal ? Math.round((recipe.cached_energy_kcal * factor / totalKcal) * 100) + '%' : '—'}</span>
            </div>
            );
          })}
          {Object.entries(state.extraIngredients)
            .filter(([, g]) => g > 0)
            .map(([ingId, grams]) => (
              <div key={`extra-${ingId}`} className="grid grid-cols-4 px-4 py-2">
                <span className="truncate">{state.extraIngredientNames[ingId] ?? `Zutat #${ingId}`}</span>
                <span className="text-right">{Math.round(grams)}g</span>
                <span className="text-right">—</span>
                <span className="text-right">—</span>
              </div>
            ))}

          {/* ── Total (Brot + Belag + Extras) ── */}
          <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/30">
            <span>Gesamt (Brot + Belag + Extras)</span>
            <span className="text-right">—</span>
            <span className="text-right">{Math.round(totalKcal)}</span>
            <span className="text-right">100%</span>
          </div>

          {/* ── Getränke ── */}
          {hasDrinks && (
            <div className="border-t border-border">
              <div className="px-4 py-2 text-xs text-muted-foreground font-medium bg-muted/20">
                Getränke (separat, kein Einfluss auf Soll)
              </div>
              {coffeeMl > 0 && (
                <div className="grid grid-cols-4 px-4 py-2">
                  <span className="truncate">Kaffee</span>
                  <span className="text-right">&times;{(coffeeMl / 200).toFixed(2).replace('.', ',')} Tasse</span>
                  <span className="text-right">{Math.round(coffeeMl * 0.02)}</span>
                  <span className="text-right">—</span>
                </div>
              )}
              {cocoaMl > 0 && (
                <div className="grid grid-cols-4 px-4 py-2">
                  <span className="truncate">Kakao</span>
                  <span className="text-right">&times;{(cocoaMl / 200).toFixed(2).replace('.', ',')} Tasse</span>
                  <span className="text-right">{Math.round(cocoaMl * 0.8)}</span>
                  <span className="text-right">—</span>
                </div>
              )}
              {teaMl > 0 && (
                <div className="grid grid-cols-4 px-4 py-2">
                  <span className="truncate">Tee</span>
                  <span className="text-right">&times;{(teaMl / 200).toFixed(2).replace('.', ',')} Tasse</span>
                  <span className="text-right">0</span>
                  <span className="text-right">—</span>
                </div>
              )}
              {milkMl > 0 && (
                <div className="grid grid-cols-4 px-4 py-2">
                  <span className="truncate">Milch</span>
                  <span className="text-right">&times;{(milkMl / 30).toFixed(2).replace('.', ',')} Schuss</span>
                  <span className="text-right">{Math.round(milkMl * 0.65)}</span>
                  <span className="text-right">—</span>
                </div>
              )}
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

      {/* Reste-Tabelle */}
      {leftovers.data && leftovers.data.toppings.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-base">Reste-Kalkulation</h3>
            <p className="text-xs text-muted-foreground">
              {normPortions} Personen × {days} Tag{days !== 1 ? 'e' : ''}
            </p>
          </div>
          <div className="divide-y divide-border text-sm">
            <div className="grid grid-cols-4 px-4 py-2 text-xs text-muted-foreground font-medium">
              <span>Belag</span>
              <span className="text-right">Bedarf</span>
              <span className="text-right">Packungen</span>
              <span className="text-right">Rest</span>
            </div>
            {leftovers.data.toppings.map((row) => (
              <div key={row.ingredient_id} className="grid grid-cols-4 px-4 py-2">
                <span className="truncate">{row.ingredient_name}</span>
                <span className="text-right">{Math.round(row.total_needed_g)}g</span>
                <span className="text-right">
                  {row.packages_needed != null ? `${row.packages_needed}×` : '—'}
                </span>
                <span className={`text-right ${row.leftover_eur && row.leftover_eur > 2 ? 'text-amber-600' : ''}`}>
                  {row.leftover_g != null ? `${Math.round(row.leftover_g)}g` : '—'}
                  {row.leftover_eur != null ? ` (${row.leftover_eur.toFixed(2)} €)` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {leftovers.isPending && (
        <p className="text-sm text-muted-foreground text-center py-4">Reste werden berechnet…</p>
      )}
    </div>
  );
}
