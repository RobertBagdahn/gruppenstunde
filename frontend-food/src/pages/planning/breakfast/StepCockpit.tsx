/**
 * Step 5 — Abschluss-Cockpit: Transparenz-Tabelle, Reste-Tabelle, SollIstBar, Normalisieren.
 */
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastLeftovers } from '@/api/breakfast';
import {
  basisKcalPerPerson,
  toppingKcalPerPerson,
  toppingGramsPerPerson,
  normalizeBePerPerson,
  energyTargetKcal,
} from '@/lib/breakfastCalc';

interface StepCockpitProps {
  wiz: UseWizardStateReturn;
  normPortions: number;
  days: number;
  dayPartFactor: number;
}

export default function StepCockpit({ wiz, normPortions, days, dayPartFactor }: StepCockpitProps) {
  const { state, setBePerPerson } = wiz;
  const leftovers = useBreakfastLeftovers();

  const basisKcal = basisKcalPerPerson(state.bePerPerson, state.basis);
  const toppingKcal = toppingKcalPerPerson(state.bePerPerson, state.toppings, state.globalIntensity);
  const totalKcal = basisKcal + toppingKcal;
  const target = energyTargetKcal(dayPartFactor);
  const coverage = target > 0 ? totalKcal / target : 0;

  // Fetch leftovers whenever relevant state changes
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
    const newBe = normalizeBePerPerson(state, dayPartFactor, 0);
    setBePerPerson(newBe);
  }

  const barWidth = Math.min(100, Math.round(coverage * 100));
  const barColor = coverage < 0.8 ? 'bg-amber-400' : coverage <= 1.1 ? 'bg-primary' : 'bg-destructive';

  return (
    <div className="space-y-6">
      {/* SollIstBar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-base">Energie-Check</h3>
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
          </p>
        </div>
      </div>

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
          {/* Basis rows */}
          {state.basis.filter((b) => b.sharePercent > 0).map((b) => {
            const g = b.sliceWeightG * state.bePerPerson * (b.sharePercent / 100);
            const kcal = b.energyKcal100g ? (b.energyKcal100g / 100) * g : 0;
            return (
              <div key={b.ingredientId} className="grid grid-cols-4 px-4 py-2">
                <span className="truncate">{b.name}</span>
                <span className="text-right">{Math.round(g)}g</span>
                <span className="text-right">{Math.round(kcal)}</span>
                <span className="text-right">{totalKcal > 0 ? Math.round(kcal / totalKcal * 100) : 0}%</span>
              </div>
            );
          })}
          {/* Topping rows */}
          {state.toppings.filter((t) => t.sharePercent > 0).map((t) => {
            const g = toppingGramsPerPerson(state.bePerPerson, t, state.globalIntensity, state.toppings);
            const kcal = t.energyKcal100g ? (t.energyKcal100g / 100) * g : 0;
            return (
              <div key={t.ingredientId} className="grid grid-cols-4 px-4 py-2">
                <span className="truncate">{t.name}</span>
                <span className="text-right">{Math.round(g)}g</span>
                <span className="text-right">{Math.round(kcal)}</span>
                <span className="text-right">{totalKcal > 0 ? Math.round(kcal / totalKcal * 100) : 0}%</span>
              </div>
            );
          })}
          {/* Total */}
          <div className="grid grid-cols-4 px-4 py-2 font-semibold bg-muted/30">
            <span>Gesamt</span>
            <span className="text-right">—</span>
            <span className="text-right">{Math.round(totalKcal)}</span>
            <span className="text-right">100%</span>
          </div>
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
