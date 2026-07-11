import { useEffect } from 'react';
import { useRecipeBySlug } from '@/api/recipes';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import InlineIngredientEditor from './InlineIngredientEditor';

interface WizardStepIngredientsProps {
  recipeId: number;
  recipeSlug: string;
  creationMethod: 'manual' | 'ai' | 'url' | null;
  onIngredientsCountChange: (count: number) => void;
  onTitleChange: (title: string) => void;
  onRecipeTypeChange: (type: string | null) => void;
  title: string;
  recipeType: string | null;
}

export default function WizardStepIngredients({
  recipeId,
  recipeSlug,
  creationMethod: _creationMethod,
  onIngredientsCountChange,
  onTitleChange,
  onRecipeTypeChange,
  title,
  recipeType,
}: WizardStepIngredientsProps) {
  const { data: recipe } = useRecipeBySlug(recipeSlug);
  const items = recipe?.recipe_items ?? [];
  const portions = recipe?.portions ?? 1;

  void _creationMethod;

  useEffect(() => {
    onIngredientsCountChange(items.length);
  }, [items.length, onIngredientsCountChange]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Titel, Typ & Zutaten</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Gib deinem Rezept einen Namen, wähle den Typ und füge Zutaten hinzu.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Titel *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="z.B. Nudelauflauf mit Hackfleisch"
            className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Rezept-Typ *</label>
          <div className="grid grid-cols-2 gap-1.5">
            {RECIPE_TYPE_OPTIONS.map((option) => {
              const isSelected = recipeType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onRecipeTypeChange(option.value)}
                  className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium border rounded-md transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Zutaten *</label>
        <div className="bg-card rounded-xl border">
          <InlineIngredientEditor
            recipeId={recipeId}
            recipeSlug={recipeSlug}
            items={items}
            portions={portions}
            initialEditPortions={1}
            onClose={() => {}}
            onSaved={() => {}}
            onSave={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
