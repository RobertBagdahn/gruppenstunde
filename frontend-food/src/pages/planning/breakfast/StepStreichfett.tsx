import { useEffect } from 'react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import { FAT_GRAMS_PER_PERSON } from '@/lib/breakfastCalc';
import ShareSlider from './ShareSlider';
import type { FatSelection } from '@/schemas/breakfast';

interface StepStreichfettProps {
  wiz: UseWizardStateReturn;
}

const KEIN_FETT: FatSelection = {
  ingredientId: 0,
  name: 'Kein Fett',
  sharePercent: 50,
  locked: false,
  energyKcal100g: 0,
  pricePerKg: 0,
  portions: [],
};

export default function StepStreichfett({ wiz }: StepStreichfettProps) {
  const { state, setFatShare, setFatLocked, initFats } = wiz;
  const { data: catalog, isLoading } = useBreakfastCatalog();

  useEffect(() => {
    if (!catalog || state.fatSelections.length > 0) return;
    const fats = catalog.fat_ingredients.map((ing, i) => {
      const defaultShare = i === 0 ? 50 : 0;
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
    // Append virtual "Kein Fett" entry
    const keinFett = { ...KEIN_FETT, sharePercent: fats.length > 0 ? 50 : 100 };
    const all: FatSelection[] = [...fats, keinFett];
    initFats(all);
  }, [catalog, state.fatSelections.length, initFats]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Lade Streichfette…</div>;
  }

  if (!catalog?.fat_ingredients?.length && state.fatSelections.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-base">Streichfett</h3>
        <p className="text-sm text-muted-foreground">
          Keine Streichfette verfügbar — lege Zutaten mit dem Tag breakfast-fat an.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-base">Streichfett-Verteilung</h3>
        <p className="text-xs text-muted-foreground">
          Welche Streichfette sollen verwendet werden? {FAT_GRAMS_PER_PERSON}g pro Person, feste Portion.
        </p>
      </div>

      {state.fatSelections.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-base">Verteilung</h3>
            <button
              type="button"
              onClick={() => wiz.openCreateModal('ingredient', 'breakfast-fat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              + Neues Streichfett erstellen
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
