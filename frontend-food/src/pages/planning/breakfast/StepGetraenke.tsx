/**
 * Step 4 — Getränke: Getränke-Rezepte aus dem Katalog auswählen.
 * Analog zu StepExtras für warme Gerichte.
 */
import { Check } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import type { BreakfastCatalog } from '@/schemas/breakfast';

interface StepGetraenkeProps {
  wiz: UseWizardStateReturn;
  catalog?: BreakfastCatalog;
}

export default function StepGetraenke({ wiz, catalog }: StepGetraenkeProps) {
  const { state, addDrinkRecipe, removeDrinkRecipe, setDrinkFactor } = wiz;

  const availableDrinks = catalog?.drink_recipes ?? [];
  const selectedIds = state.drinkRecipeIds;

  const selectedDrinks = selectedIds
    .map((id) => availableDrinks.find((r) => r.id === id))
    .filter(Boolean) as typeof availableDrinks;

  function handleToggle(recipeId: number, title: string) {
    if (selectedIds.includes(recipeId)) {
      removeDrinkRecipe(recipeId);
    } else {
      addDrinkRecipe(recipeId, title);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-base">Getränke</h3>
          <p className="text-xs text-muted-foreground">
            Wähle Getränke-Rezepte aus — Kalorien kommen aus dem Rezept.
          </p>
        </div>

        {availableDrinks.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">Keine Getränke-Rezepte verfügbar.</p>
        )}

        {/* Auswahl-Kacheln */}
        {availableDrinks.length > 0 && (
          <div className="divide-y divide-border">
            {availableDrinks.map((recipe) => {
              const isSelected = selectedIds.includes(recipe.id);
              const factor = state.drinkFactors[String(recipe.id)] ?? 1.0;
              return (
                <div key={recipe.id} className="py-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(recipe.id, recipe.title)}
                    className={`flex items-center justify-center w-6 h-6 rounded-md border-2 transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border hover:border-primary'
                    }`}
                    aria-pressed={isSelected}
                    title={isSelected ? 'Entfernen' : 'Hinzufügen'}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <span className="flex-1 text-sm font-medium">{recipe.title}</span>

                  {recipe.cached_energy_kcal != null && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {Math.round(recipe.cached_energy_kcal)} kcal
                    </span>
                  )}

                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">×</span>
                      <input
                        type="number"
                        min={0.1}
                        step={0.5}
                        value={factor}
                        onChange={(e) =>
                          setDrinkFactor(recipe.id, Math.max(0.1, Number(e.target.value)))
                        }
                        className="w-16 rounded border px-2 py-1 text-sm text-right"
                        title="Faktor (Portionsmultiplikator)"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedDrinks.length > 0 && (
          <p className="text-xs text-muted-foreground pt-1">
            {selectedDrinks.length} Getränk{selectedDrinks.length !== 1 ? 'e' : ''} ausgewählt
          </p>
        )}
      </div>

      {selectedIds.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Keine Getränke geplant — kein Problem, das ist optional.
        </p>
      )}
    </div>
  );
}