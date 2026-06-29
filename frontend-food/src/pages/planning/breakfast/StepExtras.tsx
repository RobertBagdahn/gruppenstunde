import { useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import type { BreakfastCatalog } from '@/schemas/breakfast';
import RecipeSearchDialog from '../RecipeSearchDialog';

interface StepExtrasProps {
  wiz: UseWizardStateReturn;
  mealType?: string;
  catalog?: BreakfastCatalog;
}

export default function StepExtras({ wiz, mealType = 'breakfast', catalog }: StepExtrasProps) {
  const {
    state,
    addWarmDish,
    removeWarmDish,
    setWarmDishFactor,
    setExtraIngredient,
    removeExtraIngredient,
  } = wiz;

  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  const [showAvailableDishes, setShowAvailableDishes] = useState(false);

  const extraEntries = Object.entries(state.extraIngredients).map(([id, g]) => ({
    id: Number(id),
    gramsPerPerson: g,
  }));

  const availableWarmDishes = catalog?.warm_meal_recipes ?? [];
  const selectedWarmDishIds = state.warmDishRecipeIds;
  const unselectedWarmDishes = availableWarmDishes.filter(
    (r) => !selectedWarmDishIds.includes(r.id),
  );

  return (
    <div className="space-y-6">
      {/* Warme Gerichte */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base">Warme Gerichte</h3>
            <p className="text-xs text-muted-foreground">Rezepte als warme Komponente (optional)</p>
          </div>
          {unselectedWarmDishes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAvailableDishes(!showAvailableDishes)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              {showAvailableDishes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Verfügbare
            </button>
          )}
        </div>

        {selectedWarmDishIds.length === 0 && !showAvailableDishes ? (
          <p className="text-sm text-muted-foreground py-2">Keine warmen Gerichte geplant.</p>
        ) : null}

        {/* Selected warm dishes */}
        {selectedWarmDishIds.length > 0 && (
          <div className="divide-y divide-border">
            {selectedWarmDishIds.map((recipeId) => {
              const recipe = availableWarmDishes.find((r) => r.id === recipeId);
              const factor = state.warmDishFactors[String(recipeId)] ?? 1;
              const name = state.warmDishRecipeNames[String(recipeId)] || recipe?.title || `Rezept #${recipeId}`;
              return (
                <div key={recipeId} className="py-2 flex items-center gap-3">
                  <span className="flex-1 text-sm font-medium">{name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">×</span>
                    <input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={factor}
                      onChange={(e) => setWarmDishFactor(recipeId, Math.max(0.1, Number(e.target.value)))}
                      className="w-16 rounded border px-2 py-1 text-sm text-right"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWarmDish(recipeId)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    title="Entfernen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Available warm dishes to add */}
        {showAvailableDishes && unselectedWarmDishes.length > 0 && (
          <div className="divide-y divide-border border-t border-border pt-2">
            {unselectedWarmDishes.map((recipe) => (
              <div key={recipe.id} className="py-2 flex items-center gap-3">
                <span className="flex-1 text-sm">{recipe.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    addWarmDish(recipe.id, recipe.title);
                    setWarmDishFactor(recipe.id, 1);
                  }}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Hinzufügen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base">Gemüse & Extras</h3>
            <p className="text-xs text-muted-foreground">Tomaten, Gurken, Obst etc. (optional)</p>
          </div>
          <button
            type="button"
            onClick={() => setShowIngredientSearch(true)}
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
                <span className="flex-1 text-sm font-medium">{state.extraIngredientNames[String(id)] ?? `Zutat #${id}`}</span>
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

      <RecipeSearchDialog
        mealType={mealType}
        open={showIngredientSearch}
        onOpenChange={setShowIngredientSearch}
        ingredientOnly
        onSelectIngredient={(ingredientId, _portionId, _measuringUnitId, quantity, ingredientName) => {
          setExtraIngredient(ingredientId, quantity, ingredientName);
          setShowIngredientSearch(false);
        }}
      />
    </div>
  );
}
