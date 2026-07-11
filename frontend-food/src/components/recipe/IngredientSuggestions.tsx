/**
 * IngredientSuggestions Component
 *
 * Modal showing AI-suggested ingredients for a step based on instruction.
 * Allows user to accept/reject suggestions and add them to the step.
 */

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useSuggestIngredientAssignment } from '@/hooks/useRecipeSteps';
import type { RecipeStepIngredient } from '@/schemas/recipeStep';
import { toast } from 'sonner';

interface IngredientSuggestionsProps {
  recipeSlug: string;
  stepInstruction: string;
  availableRecipeItems: Array<{
    id: number;
    name?: string;
    portion?: {
      ingredient?: { name?: string };
      measuring_unit?: { name?: string };
    };
  }>;
  currentIngredients: RecipeStepIngredient[];
  onAddSuggestions: (ingredients: RecipeStepIngredient[]) => void;
  onClose: () => void;
}

interface Suggestion {
  recipe_item_id: number;
  ingredient_name: string;
  preparation?: string;
  confidence?: number;
  selected?: boolean;
}

export default function IngredientSuggestions({
  recipeSlug,
  stepInstruction,
  availableRecipeItems,
  currentIngredients,
  onAddSuggestions,
  onClose,
}: IngredientSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const { mutate: suggestIngredients } = useSuggestIngredientAssignment();

  // Load suggestions on mount
  if (isLoadingInitial) {
    suggestIngredients(
      {
        recipe_slug: recipeSlug,
        step_instruction: stepInstruction,
      },
      {
        onSuccess: (data: any) => {
          const suggestions = (data?.suggestions || []).filter(
            (s: any) =>
              s.recipe_item_id &&
              !currentIngredients.some((ing) => ing.recipe_item_id === s.recipe_item_id)
          );
          setSuggestions(suggestions);
          setSelectedSuggestions(new Set(suggestions.map((_: any, i: number) => i)));
          setIsLoadingInitial(false);
        },
        onError: () => {
          toast.error('Fehler beim Laden von Vorschlägen');
          setIsLoadingInitial(false);
        },
      }
    );
  }

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleAddSelected = () => {
    const newIngredients: RecipeStepIngredient[] = [];
    let nextId = Math.min(...currentIngredients.map((i) => i.id || 0), -1) - 1;

    selectedSuggestions.forEach((index) => {
      const suggestion = suggestions[index];
      if (suggestion) {
        newIngredients.push({
          id: nextId--,
          recipe_item_id: suggestion.recipe_item_id,
          quantity_modifier: 1.0,
          preparation: suggestion.preparation || '',
          sort_order: currentIngredients.length + newIngredients.length,
        });
      }
    });

    if (newIngredients.length > 0) {
      onAddSuggestions(newIngredients);
      toast.success(`${newIngredients.length} Zutaten hinzugefügt`);
    }
  };

  const getItemName = (recipe_item_id: number, fallback: string): string => {
    const item = availableRecipeItems.find((i) => i.id === recipe_item_id);
    if (!item) return fallback;
    return (
      item.portion?.ingredient?.name || item.name || fallback
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Vorgeschlagene Zutaten
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {isLoadingInitial ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-600 text-sm">
              Keine neuen Zutaten gefunden. Alle Zutaten sind bereits im Rezept.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded hover:border-purple-400 hover:bg-purple-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.has(index)}
                    onChange={() => toggleSuggestion(index)}
                    className="mt-1 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {getItemName(suggestion.recipe_item_id, suggestion.ingredient_name)}
                    </p>
                    {suggestion.preparation && (
                      <p className="text-xs text-gray-600 mt-1">
                        {suggestion.preparation}
                      </p>
                    )}
                    {suggestion.confidence !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Sicherheit: {Math.round(suggestion.confidence * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedSuggestions.size === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Check size={16} />
                Hinzufügen ({selectedSuggestions.size})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
