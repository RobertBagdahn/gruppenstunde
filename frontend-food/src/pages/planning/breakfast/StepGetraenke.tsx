/**
 * Step 5 — Getränke: Getränke-Rezepte mit Verteilungs-Schiebereglern.
 * Ähnlich wie StepStreichfett, mit Basis-Getränken und optionalen Zusätzen (Milch/Säfte).
 */
import { useEffect } from 'react';
import { CupSoda, Milk, Plus } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import { useBreakfastCatalog } from '@/api/breakfast';
import ShareSlider from './ShareSlider';
import WizardSectionHeading from '../wizard/WizardSectionHeading';
import type { DrinkRecipeSelection, DrinkIngredientSelection } from '@/schemas/breakfast';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import { noExtraDrinkSelection } from '@/lib/breakfastWizardItems';
import { BREAKFAST_CARD_CLASS, BREAKFAST_CHIP_CLASS } from './breakfastStyles';

interface StepGetraenkeProps {
  wiz: UseWizardStateReturn;
}

const KEINE_MILCH_SAFT: DrinkIngredientSelection = {
  ingredientId: 0,
  name: 'Keine Milch/Säfte',
  sharePercent: 50,
  locked: false,
  mlPerPerson: 0,
};

export default function StepGetraenke({ wiz }: StepGetraenkeProps) {
  const { state, setDrinkRecipeShare, setDrinkRecipeLocked, initDrinkRecipes, setDrinkIngredientShare, setDrinkIngredientLocked, initDrinkIngredients } = wiz;
  const { data: catalog, isLoading } = useBreakfastCatalog();

  // Initialize drink recipes on first load
  useEffect(() => {
    if (!catalog || state.drinkRecipes.length > 0) return;

    const drinks = (catalog.drink_recipes ?? []).map((recipe, i) => {
      const defaultShare = i === 0 ? 50 : 0;
      return {
        recipeId: recipe.id,
        name: recipe.title,
        sharePercent: defaultShare,
        locked: false,
        energyKcal: recipe.cached_energy_total_kcal,
      };
    });

    // Add virtual "Kein Extra Getränk" option
    const keinGetraenk = noExtraDrinkSelection(drinks.length > 0 ? 50 : 100);
    const all: DrinkRecipeSelection[] = [...drinks, keinGetraenk];
    initDrinkRecipes(all);
  }, [catalog, state.drinkRecipes.length, initDrinkRecipes]);

  // Initialize drink ingredients on first load
  useEffect(() => {
    if (!catalog || state.drinkIngredients.length > 0) return;

    const ingredients = (catalog.drink_ingredients ?? []).map((ing) => ({
      ingredientId: ing.id,
      name: ing.name,
      sharePercent: 0,
      locked: false,
      mlPerPerson: null,
    }));

    // Add virtual "Keine Milch/Säfte" option
    const keineMilch = { ...KEINE_MILCH_SAFT };
    const all: DrinkIngredientSelection[] = [...ingredients, keineMilch];
    initDrinkIngredients(all);
  }, [catalog, state.drinkIngredients.length, initDrinkIngredients]);

  if (isLoading) {
    return <SkeletonTableRows rows={4} columns={2} label="Getränke werden geladen" className="p-4" />;
  }

  if (!catalog?.drink_recipes?.length && state.drinkRecipes.length === 0) {
    return (
      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<CupSoda className="h-5 w-5" />}>Getränke</WizardSectionHeading>
        <p className="-mt-2 text-body text-muted-foreground">
          Keine Getränke-Rezepte verfügbar — lege Rezepte mit dem Tag breakfast-drink an.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Getränke-Rezepte */}
      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<CupSoda className="h-5 w-5" />}>Getränke</WizardSectionHeading>
        <p className="-mt-2 text-caption text-muted-foreground">
          Wähle Getränke-Rezepte aus — Kalorien kommen aus dem Rezept.
        </p>
      </div>

      {state.drinkRecipes.length > 0 && (
        <div className={BREAKFAST_CARD_CLASS}>
          <WizardSectionHeading icon={<CupSoda className="h-5 w-5" />}>Verteilung</WizardSectionHeading>
          <div className="-mt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => wiz.openCreateModal('recipe', undefined, 'drink')}
              className={BREAKFAST_CHIP_CLASS}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Neues Getränk-Rezept erstellen
            </button>
          </div>
          <div className="space-y-4">
            {state.drinkRecipes.map((d, i) => {
              const kcal = d.energyKcal ? d.energyKcal : 0;
              return (
                <ShareSlider
                  key={`drink-${d.recipeId}`}
                  label={d.name}
                  value={d.sharePercent}
                  locked={d.locked}
                  onChange={(v) => setDrinkRecipeShare(i, v)}
                  onToggleLock={() => setDrinkRecipeLocked(i, !d.locked)}
                  detail={d.sharePercent > 0 && d.recipeId > 0
                    ? `${Math.round(kcal)} kcal`
                    : d.sharePercent > 0 && d.recipeId === 0
                      ? `${d.sharePercent}% kein Extra`
                      : 'Nicht gewählt'
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Milch & Säfte */}
      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<Milk className="h-5 w-5" />}>Milch & Säfte</WizardSectionHeading>
        <p className="-mt-2 text-caption text-muted-foreground">Zum Trinken oder für Kaffee/Kakao (optional)</p>
      </div>

      {state.drinkIngredients.length > 0 && (
        <div className={BREAKFAST_CARD_CLASS}>
          <WizardSectionHeading icon={<Milk className="h-5 w-5" />}>Verteilung</WizardSectionHeading>
          <div className="space-y-4">
            {state.drinkIngredients.map((d, i) => {
              const defaultMl = 200;
              const ml = d.mlPerPerson ?? defaultMl;
              return (
                <ShareSlider
                  key={`drink-ing-${d.ingredientId}`}
                  label={d.name}
                  value={d.sharePercent}
                  locked={d.locked}
                  onChange={(v) => setDrinkIngredientShare(i, v)}
                  onToggleLock={() => setDrinkIngredientLocked(i, !d.locked)}
                  detail={d.sharePercent > 0 && d.ingredientId > 0
                    ? `${ml}ml pro Person`
                    : d.sharePercent > 0 && d.ingredientId === 0
                      ? `${d.sharePercent}% ohne Zusatz`
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
