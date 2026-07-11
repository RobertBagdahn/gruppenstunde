/**
 * API Hooks for recipe steps using TanStack Query.
 *
 * Handles fetching, creating, updating, and deleting recipe steps.
 * Uses React Query for caching and state management.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecipeStep, RecipeStepsBatchInput } from '@/schemas/recipeStep';
import { API_BASE_URL } from '@/lib/api';

const API_BASE = `${API_BASE_URL}/api/recipes`;

// Query keys for TanStack Query
const recipeStepsKeys = {
  all: ['recipe-steps'] as const,
  bySlug: (slug: string) => [...recipeStepsKeys.all, 'by-slug', slug] as const,
  detail: (slug: string, id: number) => [...recipeStepsKeys.bySlug(slug), 'detail', id] as const,
};

function getCsrfToken(): string {
  const name = 'csrftoken';
  let cookieValue = '';
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === `${name}=`) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Fetch all steps for a recipe.
 */
export function useRecipeSteps(recipeSlug: string) {
  return useQuery({
    queryKey: recipeStepsKeys.bySlug(recipeSlug),
    queryFn: async (): Promise<RecipeStep[]> => {
      const response = await fetch(`${API_BASE}/${recipeSlug}/steps/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch steps: ${response.statusText}`);
      }
      const data = await response.json();
      // Response might be wrapped in a RecipeStepsList or be a direct array
      return Array.isArray(data) ? data : data.steps || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Fetch a single recipe step by ID.
 */
export function useRecipeStep(recipeSlug: string, stepId: number) {
  return useQuery({
    queryKey: recipeStepsKeys.detail(recipeSlug, stepId),
    queryFn: async (): Promise<RecipeStep> => {
      const response = await fetch(`${API_BASE}/${recipeSlug}/steps/${stepId}/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch step: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Batch update all steps for a recipe (replace all).
 *
 * Usage:
 * ```
 * const { mutate } = useBatchUpdateSteps();
 * mutate({
 *   recipe_slug: 'my-recipe',
 *   steps: [...]
 * });
 * ```
 */
export function useBatchUpdateSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecipeStepsBatchInput) => {
      const response = await fetch(`${API_BASE}/${input.recipe_slug}/steps/batch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update steps: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate all steps queries for this recipe
      queryClient.invalidateQueries({
        queryKey: recipeStepsKeys.bySlug(variables.recipe_slug),
      });
      // Also invalidate the recipe detail query (to refresh has_structured_steps, etc.)
      queryClient.invalidateQueries({
        queryKey: ['recipe', variables.recipe_slug],
      });
    },
  });
}

/**
 * Generate steps from recipe items using AI.
 *
 * Usage:
 * ```
 * const { mutate, isPending } = useGenerateStepsFromItems();
 * mutate({ recipe_slug: 'my-recipe' });
 * ```
 */
export function useGenerateStepsFromItems() {
  return useMutation({
    mutationFn: async (input: { recipe_slug: string }): Promise<RecipeStep[]> => {
      const response = await fetch(
        `${API_BASE}/${input.recipe_slug}/steps/generate-from-items/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to generate steps: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.steps || [];
    },
  });
}

/**
 * Suggest ingredient assignments for a step using AI.
 *
 * Usage:
 * ```
 * const { mutate } = useSuggestIngredientAssignment();
 * mutate({
 *   recipe_slug: 'my-recipe',
 *   step_instruction: 'Mix flour and sugar'
 * });
 * ```
 */
export function useSuggestIngredientAssignment() {
  return useMutation({
    mutationFn: async (input: { recipe_slug: string; step_instruction: string }) => {
      const response = await fetch(
        `${API_BASE}/${input.recipe_slug}/steps/suggest-ingredients/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to suggest ingredients: ${response.statusText}`);
      }

      return response.json();
    },
  });
}

/**
 * Improve/rewrite a step instruction with a specific tone using AI.
 *
 * Usage:
 * ```
 * const { mutate, isPending } = useImproveStepInstruction();
 * mutate({
 *   recipe_slug: 'my-recipe',
 *   step_id: 123,
 *   tone: 'präzise'
 * });
 * ```
 */
export function useImproveStepInstruction() {
  return useMutation({
    mutationFn: async (input: {
      recipe_slug: string;
      step_id: number;
      tone: string;
    }): Promise<{ improved_instruction: string; step_id: number }> => {
      const response = await fetch(
        `${API_BASE}/${input.recipe_slug}/steps/${input.step_id}/improve/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({ tone: input.tone }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to improve step: ${response.statusText}`);
      }

      return response.json();
    },
  });
}
