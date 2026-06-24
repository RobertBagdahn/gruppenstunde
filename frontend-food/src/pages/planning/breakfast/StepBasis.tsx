/**
 * Step 1 — Basis: BE/Person + Brotsortenverteilung + Gramm/kcal-Anzeige.
 */
import { useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import { basisKcalPerPerson, beToGrams } from '@/lib/breakfastCalc';
import ShareSlider from './ShareSlider';
import type { BasisSelection } from '@/schemas/breakfast';

interface StepBasisProps {
  wiz: UseWizardStateReturn;
}

export default function StepBasis({ wiz }: StepBasisProps) {
  const { state, setBePerPerson, setBasisShare, setBasisLocked, initBasis } = wiz;
  const { data: catalog } = useBreakfastCatalog();

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

  const totalGrams = beToGrams(state.bePerPerson, state.basis);
  const totalKcal = basisKcalPerPerson(state.bePerPerson, state.basis);

  return (
    <div className="space-y-6">
      {/* BE per person */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-base">Broteinheiten pro Person</h3>
        <p className="text-xs text-muted-foreground">
          1 BE = 1 Scheibe Brot oder ½ Brötchen
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setBePerPerson(state.bePerPerson - 0.5)}
            disabled={state.bePerPerson <= 1}
            className="p-2 rounded-lg border hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-2xl font-display font-bold w-12 text-center">
            {state.bePerPerson}
          </span>
          <button
            type="button"
            onClick={() => setBePerPerson(state.bePerPerson + 0.5)}
            disabled={state.bePerPerson >= 10}
            className="p-2 rounded-lg border hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="ml-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{Math.round(totalGrams)}g</span>
            {' · '}
            <span className="font-medium text-foreground">{Math.round(totalKcal)} kcal</span>
            {' '}pro Person
          </div>
        </div>
      </div>

      {/* Sortenverteilung */}
      {state.basis.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-base">Sortenverteilung</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              Math.abs(state.basis.reduce((s, b) => s + b.sharePercent, 0) - 100) < 2
                ? 'bg-primary/10 text-primary'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {state.basis.reduce((s, b) => s + b.sharePercent, 0)}%
            </span>
          </div>
          <div className="space-y-4">
            {state.basis.map((b, i) => {
              const gramsPer = b.sliceWeightG * state.bePerPerson * (b.sharePercent / 100);
              const kcalPer = b.energyKcal100g
                ? (b.energyKcal100g / 100) * gramsPer
                : null;
              return (
                <ShareSlider
                  key={b.ingredientId}
                  label={b.name}
                  value={b.sharePercent}
                  locked={b.locked}
                  onChange={(v) => setBasisShare(i, v)}
                  onToggleLock={() => setBasisLocked(i, !b.locked)}
                  detail={[
                    `${Math.round(gramsPer)}g`,
                    kcalPer ? `${Math.round(kcalPer)} kcal` : null,
                  ].filter(Boolean).join(' · ')}
                />
              );
            })}
          </div>
        </div>
      )}

      {state.basis.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Katalog wird geladen…
        </p>
      )}
    </div>
  );
}
