/**
 * API hook for recipe URL import with Gemini-based ingredient matching.
 */
import { API_BASE_URL } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const RecipeItemDraftSchema = z.object({
  ingredient_id: z.number(),
  ingredient_name: z.string(),
  ingredient_slug: z.string().optional().default(''),
  quantity: z.number(),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string(),
  note: z.string(),
  is_new_ingredient: z.boolean(),
  portion_id: z.number().nullable(),
  // A null portion is stored as grams, so such items must be clarified by the
  // user before the recipe can be saved.
  needs_unit_clarification: z.boolean().optional().default(false),
  suggested_unit_name: z.string().optional().default(''),
  suggested_portion_weight_g: z.number().nullable().optional().default(null),
  available_portions: z.array(z.object({
    id: z.number(),
    name: z.string(),
    quantity: z.number(),
    weight_g: z.number().nullable(),
    measuring_unit_id: z.number().nullable(),
    measuring_unit_name: z.string().nullable(),
    weight_status: z.string().nullable().default(null),
    weight_source: z.string().nullable().default(null),
    is_weight_trusted: z.boolean().default(false),
  })).optional().default([]),
  weight_status: z.string().nullable().default(null),
  weight_proposal_g: z.number().nullable().default(null),
  suggested_portion_name: z.string().default(''),
  confirmation_required: z.boolean().default(false),
});

export const CreatedIngredientInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  aliases: z.array(z.string()),
  nutri_class: z.number().nullable(),
  name_warning: z.string().nullable().optional(),
});

export const RecipeDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  summary: z.string().optional().default(''),
  servings: z.number().nullable(),
  preparation_time: z.number().nullable(),
  execution_time: z.number().nullable(),
  recipe_type: z.string(),
  difficulty: z.string().optional().default('easy'),
  execution_time_choice: z.string().optional().default('less_30'),
  preparation_time_choice: z.string().optional().default('none'),
  scout_level_ids: z.array(z.number()).optional().default([]),
  // Tag.id is a UUID, so the backend sends strings (RecipeDraftOut.tag_ids is
  // `list[str]`). Validating as numbers rejected every response that carried
  // at least one tag.
  tag_ids: z.array(z.string()).optional().default([]),
  steps: z.array(z.string()),
  source_url: z.string(),
  image_url: z.string().optional().default(''),
});

export const RecipeImportUrlResponseSchema = z.object({
  recipe_draft: RecipeDraftSchema,
  recipe_items: z.array(RecipeItemDraftSchema),
  created_ingredients: z.array(CreatedIngredientInfoSchema),
  input_type: z.enum(['url', 'text', 'prompt']).default('url'),
  // True when the page was unreachable and the data was reconstructed via
  // search grounding. The UI must ask the user to verify it.
  is_reconstructed: z.boolean().optional().default(false),
  ai_interaction_id: z.string().nullable().optional(),
});

export type RecipeImportUrlResponse = z.infer<typeof RecipeImportUrlResponseSchema>;
export type RecipeItemDraft = z.infer<typeof RecipeItemDraftSchema>;
export type CreatedIngredientInfo = z.infer<typeof CreatedIngredientInfoSchema>;

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

export function useRecipeImportUrl() {
  return useMutation({
    mutationFn: async (url: string): Promise<RecipeImportUrlResponse> => {
      const res = await fetch(`${API_BASE_URL}/api/recipes/import-from-url-enhanced/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Import fehlgeschlagen' }));
        throw new RecipeImportError(getImportErrorMessage(error.error_code, error.detail), error.error_code);
      }
      return RecipeImportUrlResponseSchema.parse(await res.json());
    },
  });
}

export function useRecipeSmartInput() {
  return useMutation({
    mutationFn: async (input: string): Promise<RecipeImportUrlResponse> => {
      const res = await fetch(`${API_BASE_URL}/api/recipes/smart-input/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Analyse fehlgeschlagen' }));
        throw new RecipeImportError(getImportErrorMessage(error.error_code, error.detail), error.error_code);
      }
      return RecipeImportUrlResponseSchema.parse(await res.json());
    },
  });
}
