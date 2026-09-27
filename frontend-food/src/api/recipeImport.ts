/**
 * API hook for the recipe wizard's side-effect-free ingredient review preview.
 */
import { API_BASE_URL } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import {
  IngredientReviewPreviewSchema,
  type IngredientReviewPreview,
  type RecipeImportSource,
} from '@/schemas/ingredientReview';

export class RecipeImportError extends Error {
  errorCode?: string;

  constructor(message: string, errorCode?: string) {
    super(message);
    this.name = 'RecipeImportError';
    this.errorCode = errorCode;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function getCsrfToken(): string {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1] ?? '';
}

export function useRecipeIngredientReviewPreview() {
  return useMutation({
    mutationFn: async (sources: RecipeImportSource[]): Promise<IngredientReviewPreview> => {
      const res = await fetch(`${API_BASE_URL}/api/recipes/ingredient-review/preview/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ sources }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Zutaten konnten nicht analysiert werden' }));
        throw new RecipeImportError(getImportErrorMessage(error.error_code, error.detail), error.error_code);
      }
      return IngredientReviewPreviewSchema.parse(await res.json());
    },
  });
}
