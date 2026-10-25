import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Salad, Soup, X } from 'lucide-react';
import type { UseWizardStateReturn } from './useWizardState';
import type { BreakfastCatalog } from '@/schemas/breakfast';
import RecipeSearchDialog from '../RecipeSearchDialog';
import { DecimalInput } from '@/components/ui/DecimalInput';
import WizardSectionHeading from '../wizard/WizardSectionHeading';
import { BREAKFAST_CARD_CLASS, BREAKFAST_CHIP_CLASS, BREAKFAST_ICON_BUTTON_CLASS } from './breakfastStyles';

interface StepExtrasProps {
  wiz: UseWizardStateReturn;
  mealType?: string;
  catalog?: BreakfastCatalog;
}

const NUMBER_FIELD_CLASS =
  'min-h-11 rounded-lg border border-border bg-card px-2 text-emphasis md:text-body text-right focus:outline-none focus:ring-2 focus:ring-primary/30';

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

  const extraEntries = Object.entries(state.extraIngredients).map(([id, gramsPerPerson]) => ({
    id: Number(id),
    gramsPerPerson,
    portion: state.extraIngredientSelections[id],
  }));

  const availableWarmDishes = catalog?.warm_meal_recipes ?? [];
  const selectedWarmDishIds = state.warmDishRecipeIds;
  const unselectedWarmDishes = availableWarmDishes.filter(
    (r) => !selectedWarmDishIds.includes(r.id),
  );

  return (
    <div className="space-y-5">
      {/* Warme Gerichte */}
      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<Soup className="h-5 w-5" />}>Warme Gerichte</WizardSectionHeading>
        <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption text-muted-foreground">Rezepte als warme Komponente (optional)</p>
          {unselectedWarmDishes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAvailableDishes(!showAvailableDishes)}
              className={BREAKFAST_CHIP_CLASS}
            >
              {showAvailableDishes ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              Verfügbare
            </button>
          )}
        </div>

        {selectedWarmDishIds.length === 0 && !showAvailableDishes ? (
          <p className="py-2 text-body text-muted-foreground">Keine warmen Gerichte geplant.</p>
        ) : null}

        {/* Selected warm dishes */}
        {selectedWarmDishIds.length > 0 && (
          <div className="divide-y divide-border">
            {selectedWarmDishIds.map((recipeId) => {
              const recipe = availableWarmDishes.find((r) => r.id === recipeId);
              const factor = state.warmDishFactors[String(recipeId)] ?? 1;
              const name = state.warmDishRecipeNames[String(recipeId)] || recipe?.title || `Rezept #${recipeId}`;
              return (
                <div key={recipeId} className="flex items-center gap-3 py-1">
                  <span className="flex-1 text-body font-medium">{name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-caption text-muted-foreground">×</span>
                    <DecimalInput
                      min={0.1}
                      value={factor}
                      onChange={(nextFactor) => setWarmDishFactor(recipeId, nextFactor)}
                      aria-label={`Faktor für ${name}`}
                      className={`w-16 ${NUMBER_FIELD_CLASS}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWarmDish(recipeId)}
                    className={BREAKFAST_ICON_BUTTON_CLASS}
                    title="Entfernen"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
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
              <div key={recipe.id} className="flex items-center gap-3 py-1">
                <span className="flex-1 text-body">{recipe.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    addWarmDish(recipe.id, recipe.title);
                    setWarmDishFactor(recipe.id, 1);
                  }}
                  className={BREAKFAST_CHIP_CLASS}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Hinzufügen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={BREAKFAST_CARD_CLASS}>
        <WizardSectionHeading icon={<Salad className="h-5 w-5" />}>Gemüse & Extras</WizardSectionHeading>
        <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption text-muted-foreground">Tomaten, Gurken, Obst etc. (optional)</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => wiz.openCreateModal('ingredient', 'breakfast-extra')}
              className={BREAKFAST_CHIP_CLASS}
            >
              Neues Extra erstellen
            </button>
            <button
              type="button"
              onClick={() => setShowIngredientSearch(true)}
              className={BREAKFAST_CHIP_CLASS}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Zutat
            </button>
          </div>
        </div>

        {extraEntries.length === 0 ? (
          <p className="py-2 text-body text-muted-foreground">Keine Extras geplant.</p>
        ) : (
          <div className="divide-y divide-border">
            {extraEntries.map(({ id, gramsPerPerson, portion }) => (
              <div key={id} className="flex items-center gap-3 py-1">
                <span className="flex-1 text-body font-medium">{state.extraIngredientNames[String(id)] ?? `Zutat #${id}`}</span>
                <div className="flex items-center gap-1">
                  <DecimalInput
                    min={portion ? 0.1 : 1}
                    value={portion?.quantity ?? gramsPerPerson}
                    onChange={(quantity) => setExtraIngredient(id, Math.max(portion ? 0.1 : 1, quantity))}
                    aria-label={`Menge pro Person für ${state.extraIngredientNames[String(id)] ?? `Zutat ${id}`}`}
                    className={`w-20 ${NUMBER_FIELD_CLASS}`}
                  />
                  <span className="text-caption text-muted-foreground">{portion?.portionName ?? 'g'}/P</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeExtraIngredient(id)}
                  className={BREAKFAST_ICON_BUTTON_CLASS}
                  title="Entfernen"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
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
        onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity, ingredientName, _note, portion) => {
          // Keep the portion chosen in the search dialog; freely searched extras are not in the catalog.
          setExtraIngredient(
            ingredientId,
            quantity,
            ingredientName,
            portion && portionId != null
              ? {
                  portionId,
                  measuringUnitId,
                  portionName: portion.name,
                  measuringUnitName: portion.measuring_unit,
                  quantity,
                  weightG: portion.weight_g,
                }
              : null,
          );
          setShowIngredientSearch(false);
        }}
      />
    </div>
  );
}
