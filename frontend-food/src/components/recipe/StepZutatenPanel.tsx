/**
 * Step Zutaten (Ingredients) Panel
 *
 * Manages ingredients assigned to a specific step.
 * Allows adding, removing, and editing quantity modifiers and preparation notes.
 * Includes AI-powered ingredient suggestion.
 */

import { useState, useMemo } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import type { RecipeStepIngredient } from '@/schemas/recipeStep';
import IngredientAssignmentDropdown from './IngredientAssignmentDropdown';
import IngredientSuggestions from './IngredientSuggestions';
import { useSuggestIngredientAssignment } from '@/hooks/useRecipeSteps';

interface StepZutatenPanelProps {
  stepIngredients: RecipeStepIngredient[];
  onUpdate: (ingredients: RecipeStepIngredient[]) => void;
  /**
   * Available recipe items for selection (from parent Recipe)
   */
  availableRecipeItems?: Array<{
    id: number;
    name?: string;
    portion?: {
      ingredient?: { name?: string };
      measuring_unit?: { name?: string };
    };
  }>;
  /**
   * The instruction text of this step (for ingredient suggestions)
   */
  stepInstruction?: string;
  /**
   * Recipe slug (for KI features)
   */
  recipeSlug?: string;
}

export default function StepZutatenPanel({
  stepIngredients,
  onUpdate,
  availableRecipeItems = [],
  stepInstruction = '',
  recipeSlug = '',
}: StepZutatenPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { mutate: suggestIngredients, isPending: isSuggesting } = useSuggestIngredientAssignment();

  // Memoize available items for dropdown
  const dropdownItems = useMemo(
    () =>
      availableRecipeItems.map((item) => ({
        id: item.id,
        name: item.name || '',
        ingredient_name: item.portion?.ingredient?.name || '',
        portion: item.portion,
      })),
    [availableRecipeItems]
  );

  const handleAddIngredient = () => {
    const newIngredient: RecipeStepIngredient = {
      id: Math.min(...stepIngredients.map((i) => i.id || 0), -1) - 1,
      recipe_item_id: availableRecipeItems[0]?.id || 0,
      quantity_modifier: 1.0,
      preparation: '',
      sort_order: stepIngredients.length,
    };
    onUpdate([...stepIngredients, newIngredient]);
    setEditingId(newIngredient.id);
  };

  const handleSuggestIngredients = () => {
    if (!stepInstruction.trim() || !recipeSlug) {
      return;
    }

    suggestIngredients(
      {
        recipe_slug: recipeSlug,
        step_instruction: stepInstruction,
      },
      {
        onSuccess: () => {
          setShowSuggestions(true);
        },
      }
    );
  };

  const handleRemoveIngredient = (id: number) => {
    onUpdate(stepIngredients.filter((ing) => ing.id !== id));
  };

  const handleUpdateIngredient = (
    id: number,
    updates: Partial<RecipeStepIngredient>
  ) => {
    onUpdate(
      stepIngredients.map((ing) =>
        ing.id === id ? { ...ing, ...updates } : ing
      )
    );
  };

  const getIngredientDisplay = (recipeItemId: number): string => {
    const item = availableRecipeItems.find((i) => i.id === recipeItemId);
    if (!item) return `Item #${recipeItemId}`;
    return (
      item.portion?.ingredient?.name || item.name || `Item #${recipeItemId}`
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Zutaten in diesem Schritt ({stepIngredients.length})
        </label>
        <div className="flex gap-2">
          {stepInstruction.trim() && recipeSlug && (
            <button
              onClick={handleSuggestIngredients}
              disabled={isSuggesting || !stepInstruction.trim()}
              className="flex items-center gap-1 text-sm px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="KI-Vorschläge für Zutaten basierend auf der Anweisung"
            >
              <Sparkles size={16} /> Vorschlagen
            </button>
          )}
          <button
            onClick={handleAddIngredient}
            disabled={availableRecipeItems.length === 0}
            className="flex items-center gap-1 text-sm px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Zutat
          </button>
        </div>
      </div>

      {/* Suggestions Dialog */}
      {showSuggestions && recipeSlug && (
        <IngredientSuggestions
          recipeSlug={recipeSlug}
          stepInstruction={stepInstruction}
          availableRecipeItems={availableRecipeItems}
          currentIngredients={stepIngredients}
          onAddSuggestions={(newIngredients) => {
            onUpdate([...stepIngredients, ...newIngredients]);
            setShowSuggestions(false);
          }}
          onClose={() => setShowSuggestions(false)}
        />
      )}

      {stepIngredients.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Keine Zutaten hinzugefügt</p>
      ) : (
        <div className="space-y-2">
          {stepIngredients.map((ing) => (
            <div
              key={ing.id}
              className={`p-3 bg-gray-50 rounded border transition-colors ${
                editingId === ing.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Display Mode */}
              {editingId !== ing.id && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {getIngredientDisplay(ing.recipe_item_id)}
                    </div>
                    {ing.quantity_modifier && (
                      <div className="text-xs text-gray-600 mt-1">
                        Menge: {ing.quantity_modifier}
                      </div>
                    )}
                    {ing.preparation && (
                      <div className="text-xs text-gray-600 mt-1">
                        Zubereitung: {ing.preparation}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingId(ing.id)}
                      className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleRemoveIngredient(ing.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Mode */}
              {editingId === ing.id && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Zutat
                    </label>
                    <IngredientAssignmentDropdown
                      selectedItemId={ing.recipe_item_id}
                      availableItems={dropdownItems}
                      onSelect={(itemId) =>
                        handleUpdateIngredient(ing.id, {
                          recipe_item_id: itemId,
                        })
                      }
                      placeholder="Keine Zutat ausgewählt"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mengenmodifikator
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={ing.quantity_modifier || 1}
                      onChange={(e) =>
                        handleUpdateIngredient(ing.id, {
                          quantity_modifier: parseFloat(e.target.value) || 1.0,
                        })
                      }
                      placeholder="z. B. 1.5 oder 0.5"
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Multiplikator zur Basis-Menge (z.B. 1.5 = 50% mehr)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Zubereitung
                    </label>
                    <input
                      type="text"
                      value={ing.preparation || ''}
                      onChange={(e) =>
                        handleUpdateIngredient(ing.id, { preparation: e.target.value })
                      }
                      placeholder="z. B. 'gehackt', 'gesiebt'"
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
                    >
                      Fertig
                    </button>
                    <button
                      onClick={() => handleRemoveIngredient(ing.id)}
                      className="px-3 py-1 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
