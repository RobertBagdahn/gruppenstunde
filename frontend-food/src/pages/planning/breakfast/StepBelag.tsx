/**
 * Step 2 — Belag: globaler Intensitäts-Schalter + Sortenverteilung (kcal-basiert).
 */
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import {
  computeGroupKcal,
  toppingItemGrams,
} from '@/lib/breakfastCalc';
import { formatGramsWithPortionHint } from '@/lib/portionQuantityHint';
import ShareSlider from './ShareSlider';
import type { ToppingSelection, ToppingIntensity } from '@/schemas/breakfast';

interface StepBelagProps {
  wiz: UseWizardStateReturn;
  dayPartFactor: number;
}

const INTENSITY_LABELS: Record<ToppingIntensity, string> = {
  knapp: 'Knapp',
  normal: 'Normal',
  üppig: 'Üppig',
};

export default function StepBelag({ wiz, dayPartFactor }: StepBelagProps) {
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

  const { toppingKcal } = computeGroupKcal(state.basis, state.toppings, state.fatSelections, state.gramsPerPerson, dayPartFactor, 0);
  const totalShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);
  const activeToppings = state.toppings.filter((t) => t.sharePercent > 0);

  return (
    <div className="space-y-6">
      {/* Intensität */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-base">Belag-Intensität</h3>
        <p className="text-xs text-muted-foreground">
          Wie viel Belag pro Person?
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
          Gesamt Belag: <span className="font-medium text-foreground">{Math.round(toppingKcal)} kcal</span>/Person
        </p>
      </div>

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => wiz.openCreateModal('ingredient', 'breakfast-topping')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                + Neues Belag erstellen
              </button>
              <span className="text-xs text-muted-foreground">
                {Math.round(toppingKcal)} kcal/Person
              </span>
            </div>
          </div>
          <div className="space-y-4">
            {state.toppings.map((t, i) => {
              const grams = toppingItemGrams(t.sharePercent, totalShare, toppingKcal, t.energyKcal100g);
              const kcal = t.energyKcal100g ? (t.energyKcal100g / 100) * grams : null;
              const gramsWithHint = formatGramsWithPortionHint(grams, t.portions);
              return (
                <ShareSlider
                  key={t.ingredientId}
                  label={t.name}
                  value={t.sharePercent}
                  locked={t.locked}
                  onChange={(v) => setToppingShare(i, v)}
                  onToggleLock={() => setToppingLocked(i, !t.locked)}
                  detail={t.sharePercent > 0
                    ? `${gramsWithHint} · ${kcal ? `${Math.round(kcal)} kcal` : ''}`
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
