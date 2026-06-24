/**
 * Step 2 — Belag: globaler Intensitäts-Schalter + Sortenverteilung + Deckungs-Check.
 */
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import {
  isBelagCovered,
  toppingWeightForIntensity,
  toppingKcalPerPerson,
  toppingGramsPerPerson,
} from '@/lib/breakfastCalc';
import ShareSlider from './ShareSlider';
import type { ToppingSelection, ToppingIntensity } from '@/schemas/breakfast';

interface StepBelagProps {
  wiz: UseWizardStateReturn;
}

const INTENSITY_LABELS: Record<ToppingIntensity, string> = {
  knapp: 'Knapp',
  normal: 'Normal',
  üppig: 'Üppig',
};

export default function StepBelag({ wiz }: StepBelagProps) {
  const {
    state,
    setToppingShare,
    setToppingLocked,
    setGlobalIntensity,
    initToppings,
  } = wiz;
  const { data: catalog } = useBreakfastCatalog();

  // Initialise toppings from catalog on first load
  useEffect(() => {
    if (!catalog || state.toppings.length > 0) return;
    const items: ToppingSelection[] = catalog.topping_ingredients.map((ing, i) => {
      const defaultShare = i === 0 ? 100 : 0;
      return {
        ingredientId: ing.id,
        name: ing.name,
        sharePercent: defaultShare,
        locked: false,
        energyKcal100g: ing.energy_kcal,
        pricePerKg: ing.price_per_kg,
        portions: ing.portions,
      };
    });
    // Even split for first 3 items
    const active = Math.min(3, items.length);
    const share = Math.round(100 / active);
    items.forEach((item, i) => {
      item.sharePercent = i < active
        ? (i === active - 1 ? 100 - share * (active - 1) : share)
        : 0;
    });
    initToppings(items);
  }, [catalog, state.toppings.length, initToppings]);

  const covered = isBelagCovered(state.toppings);
  const totalShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);
  const activeToppings = state.toppings.filter((t) => t.sharePercent > 0);
  const totalKcal = toppingKcalPerPerson(state.bePerPerson, state.toppings, state.globalIntensity);

  return (
    <div className="space-y-6">
      {/* Intensität */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-base">Belag-Intensität</h3>
        <p className="text-xs text-muted-foreground">
          Wie viel Belag kommt auf jede Broteinheit?
        </p>
        <div className="flex gap-2">
          {(['knapp', 'normal', 'üppig'] as ToppingIntensity[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setGlobalIntensity(level)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                state.globalIntensity === level
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted text-foreground'
              }`}
            >
              {INTENSITY_LABELS[level]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Gesamt Belag: <span className="font-medium text-foreground">{Math.round(totalKcal)} kcal</span>/Person
        </p>
      </div>

      {/* Deckungs-Check */}
      {!covered && activeToppings.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Die Beläge decken nur {totalShare}% der Broteinheiten. Auf {100 - totalShare}% der
            Scheiben kommt kein Belag.
          </p>
        </div>
      )}

      {/* Sortenwarnung ab 4 Sorten */}
      {activeToppings.length >= 4 && (
        <div className="flex items-start gap-2 bg-muted border border-border rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Bei {activeToppings.length} Sorten entstehen mehr Reste. Lieber 2–3 Sorten wählen.
          </p>
        </div>
      )}

      {/* Sortenverteilung */}
      {state.toppings.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-base">Sortenverteilung</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              covered ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
            }`}>
              {totalShare}%
            </span>
          </div>
          <div className="space-y-4">
            {state.toppings.map((t, i) => {
              const grams = toppingGramsPerPerson(
                state.bePerPerson, t, state.globalIntensity, state.toppings
              );
              const portionWeight = toppingWeightForIntensity(t, state.globalIntensity);
              return (
                <ShareSlider
                  key={t.ingredientId}
                  label={t.name}
                  value={t.sharePercent}
                  locked={t.locked}
                  onChange={(v) => setToppingShare(i, v)}
                  onToggleLock={() => setToppingLocked(i, !t.locked)}
                  detail={t.sharePercent > 0
                    ? `${portionWeight}g/BE · ${Math.round(grams)}g ges.`
                    : 'Nicht gewählt'
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
