/**
 * Step 1 — Basis: Brotsortenverteilung + Gramm/kcal-Anzeige.
 */
import { useEffect } from 'react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import { computeGroupKcal, breadItemGrams } from '@/lib/breakfastCalc';
import ShareSlider from './ShareSlider';
import type { BasisSelection } from '@/schemas/breakfast';

interface StepBasisProps {
  wiz: UseWizardStateReturn;
  dayPartFactor: number;
}

export default function StepBasis({ wiz, dayPartFactor }: StepBasisProps) {
  const { state, setBasisShare, setBasisLocked, initBasis } = wiz;
  const { data: catalog, isPending, isError } = useBreakfastCatalog();

  // Initialise basis list from catalog on first load (if not yet set)
  useEffect(() => {
    if (!catalog || state.basis.length > 0) return;
    const initial: BasisSelection[] = catalog.base_ingredients.map((ing, i) => ({
      ingredientId: ing.id,
      name: ing.name,
      sharePercent: i === 0 ? 100 : 0,
      locked: false,
      sliceWeightG: ing.standard_recipe_weight_g ?? 50,
      energyKcal100g: ing.energy_kcal,
    }));
    // Even split if multiple items
    if (initial.length > 1) {
      const share = Math.round(100 / initial.length);
      initial.forEach((item, i) => {
        item.sharePercent = i === initial.length - 1
          ? 100 - share * (initial.length - 1)
          : share;
      });
    }
    initBasis(initial);
  }, [catalog, state.basis.length, initBasis]);

  const { breadKcal } = computeGroupKcal(state.basis, state.toppings, dayPartFactor, 0);
  const totalShare = state.basis.reduce((s, b) => s + b.sharePercent, 0);
  const totalGrams = state.basis.reduce((s, b) =>
    s + breadItemGrams(b.sharePercent, totalShare, breadKcal, b.energyKcal100g), 0);

  return (
    <div className="space-y-6">
      {/* Sortenverteilung */}
      {state.basis.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-base">Sortenverteilung</h3>
            <span className="text-xs text-muted-foreground">
              {Math.round(totalGrams)}g · {Math.round(breadKcal)} kcal/Person
            </span>
          </div>
          <div className="space-y-4">
            {state.basis.map((b, i) => {
              const grams = breadItemGrams(b.sharePercent, totalShare, breadKcal, b.energyKcal100g);
              const kcal = b.energyKcal100g ? (b.energyKcal100g / 100) * grams : null;
              return (
                <ShareSlider
                  key={b.ingredientId}
                  label={b.name}
                  value={b.sharePercent}
                  locked={b.locked}
                  onChange={(v) => setBasisShare(i, v)}
                  onToggleLock={() => setBasisLocked(i, !b.locked)}
                  detail={[
                    `${Math.round(grams)}g`,
                    kcal ? `${Math.round(kcal)} kcal` : null,
                  ].filter(Boolean).join(' · ')}
                />
              );
            })}
          </div>
        </div>
      )}

      {isPending && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Katalog wird geladen…
        </p>
      )}
      {isError && (
        <p className="text-sm text-destructive text-center py-8">
          Fehler beim Laden des Katalogs
        </p>
      )}
      {!isPending && !isError && catalog && catalog.base_ingredients.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Keine Basis-Zutaten verfügbar
        </p>
      )}
    </div>
  );
}
