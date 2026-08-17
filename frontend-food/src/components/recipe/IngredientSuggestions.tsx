/**
 * IngredientSuggestions Component
 *
 * Modal showing AI-suggested ingredients for a step based on instruction.
 * Allows user to accept/reject suggestions and add them to the step.
 */

import { useEffect, useRef, useState } from 'react';
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
    ingredient_name?: string;
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

function isSuggestion(value: unknown): value is Suggestion {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.recipe_item_id === 'number' && typeof candidate.ingredient_name === 'string';
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

  // Load suggestions on mount.
  // IMPORTANT: this must run in an effect, not directly in the render body —
  // calling a mutation during render fired on every re-render while
  // `isLoadingInitial` was still true (before the async response arrived),
  // spamming the backend with dozens of duplicate requests per second.
  // `hasFetchedRef` additionally guards against React StrictMode's
  // double-invoke of effects in development.
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    suggestIngredients(
      {
        recipe_slug: recipeSlug,
        step_instruction: stepInstruction,
      },
      {
        onSuccess: (data: unknown) => {
          const rawSuggestions =
            typeof data === 'object' && data !== null && 'suggestions' in data && Array.isArray(data.suggestions)
              ? data.suggestions
              : [];
          const suggestions = rawSuggestions.filter(isSuggestion).filter(
            (s) => !currentIngredients.some((ing) => ing.recipe_item_id === s.recipe_item_id),
          );
          setSuggestions(suggestions);
          setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
          setIsLoadingInitial(false);
        },
        onError: () => {
          toast.error('Fehler beim Laden von Vorschlägen');
          setIsLoadingInitial(false);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      item.portion?.ingredient?.name || item.ingredient_name || item.name || fallback
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Vorgeschlagene Zutaten
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X size={20} />
          </button>
        </div>

        {isLoadingInitial ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Keine neuen Zutaten gefunden. Alle Zutaten sind bereits im Rezept.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border border-border rounded hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.has(index)}
                    onChange={() => toggleSuggestion(index)}
                    className="mt-1 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {getItemName(suggestion.recipe_item_id, suggestion.ingredient_name)}
                    </p>
                    {suggestion.preparation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.preparation}
                      </p>
                    )}
                    {suggestion.confidence !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
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
                className="flex-1 px-4 py-2 text-foreground bg-secondary hover:bg-secondary/80 rounded transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedSuggestions.size === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
