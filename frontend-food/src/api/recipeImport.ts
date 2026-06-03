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
  quantity: z.number(),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string(),
  note: z.string(),
  is_new_ingredient: z.boolean(),
  portion_id: z.number().nullable(),
});

export const CreatedIngredientInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  aliases: z.array(z.string()),
  nutri_class: z.number().nullable(),
});

export const RecipeDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  summary: z.string().optional().default(''),
  servings: z.number(),
  preparation_time: z.number().nullable(),
  execution_time: z.number().nullable(),
  recipe_type: z.string(),
  difficulty: z.string().optional().default('easy'),
  execution_time_choice: z.string().optional().default('less_30'),
  preparation_time_choice: z.string().optional().default('none'),
  costs_rating: z.string().optional().default('less_1'),
  scout_level_ids: z.array(z.number()).optional().default([]),
  tag_ids: z.array(z.number()).optional().default([]),
  steps: z.array(z.string()),
  source_url: z.string(),
});

export const RecipeImportUrlResponseSchema = z.object({
  recipe_draft: RecipeDraftSchema,
  recipe_items: z.array(RecipeItemDraftSchema),
  created_ingredients: z.array(CreatedIngredientInfoSchema),
});

export type RecipeImportUrlResponse = z.infer<typeof RecipeImportUrlResponseSchema>;
export type RecipeItemDraft = z.infer<typeof RecipeItemDraftSchema>;
export type CreatedIngredientInfo = z.infer<typeof CreatedIngredientInfoSchema>;

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
        throw new Error(error.detail || 'Import fehlgeschlagen');
      }
      return RecipeImportUrlResponseSchema.parse(await res.json());
    },
  });
}
