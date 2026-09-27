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

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const IMPORT_ERROR_CODES = {
  INVALID_URL: 'IMPORT_INVALID_URL',
  SOURCE_UNREACHABLE: 'IMPORT_SOURCE_UNREACHABLE',
  AI_UNAVAILABLE: 'IMPORT_AI_UNAVAILABLE',
  NO_RECIPE_FOUND: 'IMPORT_NO_RECIPE_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

const IMPORT_ERROR_MESSAGES: Record<string, string> = {
  [IMPORT_ERROR_CODES.INVALID_URL]:
    'Die URL ist ungültig. Bitte prüfe den Link oder lege das Rezept manuell an.',
  [IMPORT_ERROR_CODES.SOURCE_UNREACHABLE]:
    'Die Seite konnte nicht geladen werden. Manche Rezeptseiten blockieren den automatischen Abruf — bitte kopiere die Zutaten manuell oder versuche eine andere Quelle.',
  [IMPORT_ERROR_CODES.AI_UNAVAILABLE]:
    'Der KI-Dienst ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten erneut.',
  [IMPORT_ERROR_CODES.NO_RECIPE_FOUND]:
    'Auf der Seite wurden keine Rezeptdaten gefunden. Bitte prüfe den Link oder gib das Rezept manuell ein.',
};

const IMPORT_ERROR_FALLBACK_MESSAGE = 'Import fehlgeschlagen. Bitte versuche es erneut oder lege das Rezept manuell an.';

export function getImportErrorMessage(errorCode: string | undefined, detail?: string): string {
  if (errorCode && IMPORT_ERROR_MESSAGES[errorCode]) {
    return IMPORT_ERROR_MESSAGES[errorCode];
  }
  return detail || IMPORT_ERROR_FALLBACK_MESSAGE;
}

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
