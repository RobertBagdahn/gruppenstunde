/**
 * Step 1 — Basis: Brotsortenverteilung + Gramm/kcal-Anzeige.
 */
import { useEffect } from 'react';
import { Plus, Wheat } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import { computeGroupKcal, breadItemGrams } from '@/lib/breakfastCalc';
import { formatGramsWithPortionHint } from '@/lib/portionQuantityHint';
import ShareSlider from './ShareSlider';
import WizardSectionHeading from '../wizard/WizardSectionHeading';
import type { BasisSelection } from '@/schemas/breakfast';
import { BREAKFAST_CARD_CLASS, BREAKFAST_CHIP_CLASS } from './breakfastStyles';

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
    initBasis(initial);
  }, [catalog, state.basis.length, initBasis]);

  const { breadKcal } = computeGroupKcal(state.basis, state.toppings, state.fatSelections, state.gramsPerPerson, dayPartFactor, 0);
  const totalShare = state.basis.reduce((s, b) => s + b.sharePercent, 0);
  const totalGrams = state.basis.reduce((s, b) =>
    s + breadItemGrams(b.sharePercent, totalShare, breadKcal, b.energyKcal100g), 0);

  const hasMuesli = state.basis.some((b) => /müsli|haferflock/i.test(b.name) && b.sharePercent > 0);

  return (
    <div className="space-y-5">
      {/* Sortenverteilung */}
      {state.basis.length > 0 && (
        <div className={BREAKFAST_CARD_CLASS}>
          <WizardSectionHeading icon={<Wheat className="h-5 w-5" />}>Sortenverteilung</WizardSectionHeading>
          <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-caption text-muted-foreground">
              {Math.round(totalGrams)} g · {Math.round(breadKcal)} kcal/Person
            </span>
            <button
              type="button"
              onClick={() => wiz.openCreateModal('ingredient', 'breakfast-base')}
              className={BREAKFAST_CHIP_CLASS}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Neue Basis erstellen
            </button>
          </div>
          <div className="space-y-4">
            {state.basis.map((b, i) => {
              const grams = breadItemGrams(b.sharePercent, totalShare, breadKcal, b.energyKcal100g);
              const kcal = b.energyKcal100g ? (b.energyKcal100g / 100) * grams : null;

              // Get portions from catalog for portion hint
              const catalogIng = catalog?.base_ingredients.find((ing) => ing.id === b.ingredientId);
              const gramsWithHint = formatGramsWithPortionHint(grams, catalogIng?.portions);

              return (
                <ShareSlider
                  key={b.ingredientId}
                  label={b.name}
                  value={b.sharePercent}
                  locked={b.locked}
                  onChange={(v) => setBasisShare(i, v)}
                  onToggleLock={() => setBasisLocked(i, !b.locked)}
                  detail={[
                    gramsWithHint,
                    kcal ? `${Math.round(kcal)} kcal` : null,
                  ].filter(Boolean).join(' · ')}
                />
              );
            })}
          </div>
          {hasMuesli && (
            <p className="rounded-lg bg-muted px-3 py-2 text-caption text-muted-foreground">
              Müsli-Menge als Trockenprodukt. Milch, Hafermilch und Obst kannst du in den nächsten Schritten ergänzen.
            </p>
          )}
        </div>
      )}

      {isPending && (
        <p className="py-8 text-center text-body text-muted-foreground">
          Katalog wird geladen…
        </p>
      )}
      {isError && (
        <p className="py-8 text-center text-body text-destructive">
          Fehler beim Laden des Katalogs
        </p>
      )}
      {!isPending && !isError && catalog && catalog.base_ingredients.length === 0 && (
        <p className="py-8 text-center text-body text-muted-foreground">
          Keine Basis-Zutaten verfügbar
        </p>
      )}
    </div>
  );
}
