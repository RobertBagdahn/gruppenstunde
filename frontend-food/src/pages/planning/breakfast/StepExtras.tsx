/**
 * Step 3 — Extras: Gemüse (Zutaten mit Mengen) + warme Gerichte (Rezeptauswahl + Faktor).
 */
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import RecipeSearchDialog from '../RecipeSearchDialog';
import { FactorInput } from '../FactorInput';

interface StepExtrasProps {
  wiz: UseWizardStateReturn;
  mealType?: string;
}

export default function StepExtras({ wiz, mealType = 'breakfast' }: StepExtrasProps) {
  const {
    state,
    addWarmDish,
    removeWarmDish,
    setWarmDishFactor,
    setExtraIngredient,
    removeExtraIngredient,
  } = wiz;

  const [showRecipeSearch, setShowRecipeSearch] = useState(false);

  const extraEntries = Object.entries(state.extraIngredients).map(([id, g]) => ({
    id: Number(id),
    gramsPerPerson: g,
  }));

  return (
    <div className="space-y-6">
      {/* Warme Gerichte */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base">Warme Gerichte</h3>
            <p className="text-xs text-muted-foreground">Rührei, Pfannkuchen etc. (optional)</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRecipeSearch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Gericht
          </button>
        </div>

        {state.warmDishRecipeIds.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Keine warmen Gerichte geplant.</p>
        ) : (
          <div className="divide-y divide-border">
            {state.warmDishRecipeIds.map((id) => (
              <div key={id} className="py-2 flex items-center gap-3">
                <span className="flex-1 text-sm font-medium">Rezept #{id}</span>
                <FactorInput
                  value={state.warmDishFactors[String(id)] ?? 1.0}
                  onChange={(f) => setWarmDishFactor(id, f)}
                />
                <button
                  type="button"
                  onClick={() => removeWarmDish(id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title="Entfernen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gemüse / Standalone Zutaten */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base">Gemüse & Extras</h3>
            <p className="text-xs text-muted-foreground">Tomaten, Gurken, Obst etc. (optional)</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRecipeSearch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" />
            Zutat
          </button>
        </div>

        {extraEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Keine Extras geplant.</p>
        ) : (
          <div className="divide-y divide-border">
            {extraEntries.map(({ id, gramsPerPerson }) => (
              <div key={id} className="py-2 flex items-center gap-3">
                <span className="flex-1 text-sm font-medium">Zutat #{id}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    step={5}
                    value={gramsPerPerson}
                    onChange={(e) => setExtraIngredient(id, Math.max(1, Number(e.target.value)))}
                    className="w-20 rounded border px-2 py-1 text-sm text-right"
                  />
                  <span className="text-xs text-muted-foreground">g/P</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeExtraIngredient(id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title="Entfernen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipe search dialog (shared for warm dishes + ingredients) */}
      <RecipeSearchDialog
        mealType={mealType}
        open={showRecipeSearch}
        onOpenChange={setShowRecipeSearch}
        onSelect={(recipeId) => {
          addWarmDish(recipeId);
          setShowRecipeSearch(false);
        }}
        onSelectIngredient={(ingredientId, _portionId, _measuringUnitId, quantity) => {
          setExtraIngredient(ingredientId, quantity);
          setShowRecipeSearch(false);
        }}
      />
    </div>
  );
}
