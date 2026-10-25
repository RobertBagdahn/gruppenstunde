/**
 * Step 2 — Belag: globaler Intensitäts-Schalter + Sortenverteilung (kcal-basiert).
 */
import { useEffect } from 'react';
import { AlertTriangle, Plus, Sandwich, SlidersHorizontal } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import {
  computeGroupKcal,
  toppingItemGrams,
} from '@/lib/breakfastCalc';
import { formatGramsWithPortionHint } from '@/lib/portionQuantityHint';
import ShareSlider from './ShareSlider';
import WizardSectionHeading from '../wizard/WizardSectionHeading';
import type { ToppingSelection, ToppingIntensity } from '@/schemas/breakfast';
import { BREAKFAST_CARD_CLASS, BREAKFAST_CHIP_CLASS } from './breakfastStyles';

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

  // Initialise toppings from catalog on first load. An explicit "no topping" choice keeps
  // the toppings listed at 0 %, so only an empty list counts as not initialised.
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

  const { toppingKcal, toppingBudgetKcal } = computeGroupKcal(state.basis, state.toppings, state.fatSelections, state.gramsPerPerson, dayPartFactor, 0);
  const totalShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);
  const activeToppings = state.toppings.filter((t) => t.sharePercent > 0);

  return (
    <div className="space-y-5">
      {/* Intensität */}
      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<SlidersHorizontal className="h-5 w-5" />}>Belag-Intensität</WizardSectionHeading>
        <p className="-mt-2 text-caption text-muted-foreground">
          Wie viel Belag pro Person?
        </p>
        <div className="flex gap-2">
          {(['knapp', 'normal', 'üppig'] as ToppingIntensity[]).map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={state.globalIntensity === level}
              onClick={() => setGlobalIntensity(level)}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-lg border px-3 text-body font-semibold transition-colors ${
                state.globalIntensity === level
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {INTENSITY_LABELS[level]}
            </button>
          ))}
        </div>
        <p className="text-caption text-muted-foreground">
          Gesamt Belag: <span className="font-semibold text-foreground">{Math.round(toppingKcal)} kcal</span>/Person
        </p>
      </div>

      {/* Sortenwarnung ab 4 Sorten */}
      {activeToppings.length >= 4 && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-body text-muted-foreground">
            Bei {activeToppings.length} Sorten entstehen mehr Reste. Lieber 2–3 Sorten wählen.
          </p>
        </div>
      )}

      {/* Sortenverteilung */}
      {state.toppings.length > 0 && (
        <div className={BREAKFAST_CARD_CLASS}>
          <WizardSectionHeading icon={<Sandwich className="h-5 w-5" />}>Sortenverteilung</WizardSectionHeading>
          <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-caption text-muted-foreground">
              {Math.round(toppingKcal)} kcal/Person
            </span>
            <button
              type="button"
              onClick={() => wiz.openCreateModal('ingredient', 'breakfast-topping')}
              className={BREAKFAST_CHIP_CLASS}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Neues Belag erstellen
            </button>
          </div>
          <div className="space-y-4">
            {state.toppings.map((t, i) => {
              const grams = toppingItemGrams(t.sharePercent, totalShare, toppingBudgetKcal, t.energyKcal100g);
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
