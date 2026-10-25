import { useEffect } from 'react';
import { Droplet, Plus } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import { FAT_GRAMS_PER_PERSON } from '@/lib/breakfastCalc';
import ShareSlider from './ShareSlider';
import WizardSectionHeading from '../wizard/WizardSectionHeading';
import { fatSelectionsWithNoFat } from '@/lib/breakfastWizardItems';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import { BREAKFAST_CARD_CLASS, BREAKFAST_CHIP_CLASS } from './breakfastStyles';

interface StepStreichfettProps {
  wiz: UseWizardStateReturn;
}

export default function StepStreichfett({ wiz }: StepStreichfettProps) {
  const { state, setFatShare, setFatLocked, initFats } = wiz;
  const { data: catalog, isLoading } = useBreakfastCatalog();

  // An empty list means "not initialised yet"; an explicit "no fat" choice keeps "Kein Fett" at 100 %.
  useEffect(() => {
    if (!catalog || state.fatSelections.length > 0) return;
    initFats(fatSelectionsWithNoFat(catalog.fat_ingredients, catalog.fat_ingredients[0]?.id ?? null));
  }, [catalog, state.fatSelections.length, initFats]);

  if (isLoading) {
    return <SkeletonTableRows rows={4} columns={2} label="Streichfette werden geladen" className="p-4" />;
  }

  if (!catalog?.fat_ingredients?.length && state.fatSelections.length === 0) {
    return (
      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<Droplet className="h-5 w-5" />}>Streichfett</WizardSectionHeading>
        <p className="-mt-2 text-body text-muted-foreground">
          Keine Streichfette verfügbar — lege Zutaten mit dem Tag buffet-fat an.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<Droplet className="h-5 w-5" />}>Streichfett-Verteilung</WizardSectionHeading>
        <p className="-mt-2 text-caption text-muted-foreground">
          Welche Streichfette sollen verwendet werden? {FAT_GRAMS_PER_PERSON}g pro Person, feste Portion.
        </p>
      </div>

      {state.fatSelections.length > 0 && (
        <div className={BREAKFAST_CARD_CLASS}>
          <WizardSectionHeading icon={<Droplet className="h-5 w-5" />}>Verteilung</WizardSectionHeading>
          <div className="-mt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => wiz.openCreateModal('ingredient', 'breakfast-fat')}
              className={BREAKFAST_CHIP_CLASS}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Neues Streichfett erstellen
            </button>
          </div>
          <div className="space-y-4">
            {state.fatSelections.map((f, i) => {
              const grams = f.ingredientId > 0 ? (f.sharePercent / 100) * FAT_GRAMS_PER_PERSON : 0;
              const kcal = f.energyKcal100g ? (f.energyKcal100g / 100) * grams : 0;
              return (
                <ShareSlider
                  key={`fat-${f.ingredientId}`}
                  label={f.name}
                  value={f.sharePercent}
                  locked={f.locked}
                  onChange={(v) => setFatShare(i, v)}
                  onToggleLock={() => setFatLocked(i, !f.locked)}
                  detail={f.sharePercent > 0 && f.ingredientId > 0
                    ? `${Math.round(grams * 10) / 10}g · ${Math.round(kcal)} kcal`
                    : f.sharePercent > 0 && f.ingredientId === 0
                      ? `${f.sharePercent}% ohne Fett`
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
