/**
 * TanStack Query hooks for the MealPlan API.
 * MUST stay in sync with backend/planner/api/meal_plan.py
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  MealPlanCollaboratorSchema,
  MealPlanSchema,
  MealPlanDetailSchema,
  MealSchema,
  MealItemSchema,
  MealPlanCostSummarySchema,
  NutritionSummarySchema,
  ShoppingListItemSchema,
  UnifiedSearchResponseSchema,
  RecipePopularResponseSchema,
  MealItemVariantInSchema,
  type MealItemVariantIn,
  type MealPlanCollaborator,
  type RecipePopularResponse,
  type MealPlan,
  type MealPlanDetail,
  type MealPlanCostSummary,
  type NutritionSummary,
  type UnifiedSearchResponse,
  type RecipeSuggestionsResponse,
  RecipeSuggestionsResponseSchema,
  type MealUpdateIn,
  type CopyItemsFromPlanIn,
  NutritionalTagScanResponseSchema,
  type NutritionalTagScanResponse,
  RecentlyUsedResponseSchema,
  type RecentlyUsedResponse,
  type RecipeSuggestion,
  CookingScheduleSchema,
  type CookingSchedule,
  IntelligentSuggestionsResponseSchema,
  type IntelligentSuggestionsResponse,
} from '@/schemas/mealPlan';
import { z } from 'zod';
import { AiApplyOutSchema, AiSuggestOutSchema } from '@/schemas/mealPlan';
import type { AiApplyOut, AiSuggestOut } from '@/schemas/mealPlan';

const API_BASE = `${API_BASE_URL}/api/meal-plans`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodType<T, any, any>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodType<T, any, any>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function patchJson<T>(url: string, body: unknown, schema: z.ZodType<T, any, any>): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-CSRFToken': getCsrfToken() },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
}

// ==========================================================================
// MealPlan Hooks
// ==========================================================================

export interface MealPlanFilterParams {
  search?: string;
  origin?: string;
  sort?: string;
  date_from?: string;
  date_to?: string;
}

export function useMealPlans(filters: MealPlanFilterParams = {}) {
  const queryKey = ['meal-plans', filters] as const;
  return useQuery<MealPlan[]>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.origin && filters.origin !== 'all') params.set('origin', filters.origin);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      const qs = params.toString();
      return fetchJson(`${API_BASE}/${qs ? `?${qs}` : ''}`, z.array(MealPlanSchema));
    },
  });
}

export function useMealPlan(id: number) {
  return useQuery<MealPlanDetail>({
    queryKey: ['meal-plan', id],
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, MealPlanDetailSchema),
    enabled: id > 0,
  });
}

export function useIngredientScan(mealPlanId: number) {
  return useQuery<NutritionalTagScanResponse>({
    queryKey: ['meal-plan-ingredient-scan', mealPlanId],
    queryFn: () => fetchJson(`${API_BASE}/${mealPlanId}/ingredient-scan/`, NutritionalTagScanResponseSchema),
    enabled: mealPlanId > 0,
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      norm_portions?: number;
      reserve_factor?: number;
      event_id?: number | null;
      start_datetime?: string | null;
      end_datetime?: string | null;
      day_part_factors?: Record<string, number>;
      nutritional_tag_ids?: number[];
    }) => postJson(`${API_BASE}/`, body, MealPlanSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
}

export function useAiMealPlanSuggest() {
  return useMutation({
    mutationFn: (body: {
      prompt: string;
      num_persons: number;
      num_days: number;
      start_date: string;
      nutritional_tag_ids?: number[];
      budget_per_person_per_day?: number;
    }): Promise<AiSuggestOut> => postJson(`${API_BASE}/ai/suggest/`, body, AiSuggestOutSchema),
  });
}

export function useApplyAiSuggestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, body }: { planId: number; body: AiSuggestOut }): Promise<AiApplyOut> =>
      postJson(`${API_BASE}/${planId}/apply-ai/`, body, AiApplyOutSchema),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', variables.planId] });
    },
  });
}

export function useUpdateMealPlan(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      description?: string;
      norm_portions?: number;
      reserve_factor?: number;
      budget_per_person_per_day?: number | null;
      start_datetime?: string | null;
      end_datetime?: string | null;
      day_part_factors?: Record<string, number>;
      nutritional_tag_ids?: number[];
    }) => patchJson(`${API_BASE}/${id}/`, body, MealPlanSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan-ingredient-scan', id] });
    },
  });
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${API_BASE}/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
}

export function useDuplicateMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name: string; start_datetime: string; end_datetime: string; norm_portions: number }) =>
      postJson(`${API_BASE}/${id}/duplicate/`, body, MealPlanSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
}

// ==========================================================================
// Day Hooks (convenience: add/remove all default meals for a date)
// ==========================================================================

export function useAddDay(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string }) =>
      postJson(`${API_BASE}/${mealPlanId}/days/`, body, z.array(MealSchema)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useAddDayBefore(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      postJson(`${API_BASE}/${mealPlanId}/add-day-before/`, {}, z.array(MealSchema)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
}

export function useAddDayAfter(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      postJson(`${API_BASE}/${mealPlanId}/add-day-after/`, {}, z.array(MealSchema)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
}

export function useRemoveDay(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) =>
      deleteJson(`${API_BASE}/${mealPlanId}/days/?date=${date}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

// ==========================================================================
// Meal Hooks
// ==========================================================================

export function useAddMeal(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      start_datetime: string;
      end_datetime: string;
      meal_type: string;
      day_part_factor?: number | null;
    }) => postJson(`${API_BASE}/${mealPlanId}/meals/`, body, MealSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useRemoveMeal(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mealId: number) =>
      deleteJson(`${API_BASE}/${mealPlanId}/meals/${mealId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

// ==========================================================================
// MealItem Hooks
// ==========================================================================

export function useAddMealItem(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealId,
      ...body
    }: {
      mealId: number;
      recipe_id?: number;
      ingredient_id?: number;
      quantity?: number;
      measuring_unit_id?: number;
      factor?: number;
    }) => postJson(`${API_BASE}/${mealPlanId}/meals/${mealId}/items/`, body, MealItemSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useRemoveMealItem(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      deleteJson(`${API_BASE}/${mealPlanId}/meal-items/${itemId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useUpdateMealItem(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, factor, quantity }: { itemId: number; factor?: number; quantity?: number }) =>
      patchJson(
        `${API_BASE}/${mealPlanId}/meal-items/${itemId}/`,
        { ...(factor !== undefined ? { factor } : {}), ...(quantity !== undefined ? { quantity } : {}) },
        MealItemSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useUpdateMeal(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealId,
      ...body
    }: {
      mealId: number;
    } & MealUpdateIn) => patchJson(`${API_BASE}/${mealPlanId}/meals/${mealId}/`, body, MealSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useScaleMealToTarget(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mealId: number) =>
      postJson(`${API_BASE}/${mealPlanId}/meals/${mealId}/scale-to-target/`, {}, MealSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useCopyItemsFromPlan(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealId,
      ...body
    }: {
      mealId: number;
    } & CopyItemsFromPlanIn) =>
      postJson(
        `${API_BASE}/${planId}/meals/${mealId}/copy-items-from/`,
        body,
        z.array(MealItemSchema),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
    },
  });
}

// ==========================================================================
// Nutrition & Shopping List
// ==========================================================================

export function useNutritionSummary(mealPlanId: number, date?: string) {
  return useQuery<NutritionSummary>({
    queryKey: ['meal-plan', mealPlanId, 'nutrition', date],
    queryFn: () => {
      const url = date
        ? `${API_BASE}/${mealPlanId}/nutrition-summary/?date=${date}`
        : `${API_BASE}/${mealPlanId}/nutrition-summary/`;
      return fetchJson(url, NutritionSummarySchema);
    },
    enabled: mealPlanId > 0,
  });
}

export function useShoppingList(mealPlanId: number) {
  return useQuery({
    queryKey: ['meal-plan', mealPlanId, 'shopping-list'],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/${mealPlanId}/shopping-list/`,
        z.array(ShoppingListItemSchema),
      ),
    enabled: mealPlanId > 0,
  });
}

export function useMealPlanCosts(mealPlanId: number) {
  return useQuery<MealPlanCostSummary>({
    queryKey: ['meal-plan', mealPlanId, 'costs'],
    queryFn: () =>
      fetchJson(`${API_BASE}/${mealPlanId}/costs/`, MealPlanCostSummarySchema),
    enabled: mealPlanId > 0,
  });
}

// ==========================================================================
// Recipe Search
// ==========================================================================

export interface RecipeSearchParams {
  q?: string;
  meal_type?: string;
  recipe_types?: string[];
  recipe_badge?: 'verified' | 'community' | null;
  nutritional_tag_ids?: number[];
  exclude_nutritional_tag_ids?: number[];
  tag_ids?: number[];
  limit?: number;
}

export function useRecipeSearch(params: RecipeSearchParams) {
  const { q, meal_type, recipe_types, recipe_badge, exclude_nutritional_tag_ids, nutritional_tag_ids, tag_ids, limit } = params;

  const searchParams = new URLSearchParams();
  if (q) searchParams.set('q', q);
  if (meal_type) searchParams.set('meal_type', meal_type);
  if (recipe_types?.length) searchParams.set('recipe_types', recipe_types.join(','));
  if (recipe_badge) searchParams.set('recipe_badge', recipe_badge);
  if (exclude_nutritional_tag_ids?.length)
    searchParams.set('exclude_nutritional_tag_ids', exclude_nutritional_tag_ids.join(','));
  if (nutritional_tag_ids?.length)
    searchParams.set('nutritional_tag_ids', nutritional_tag_ids.join(','));
  if (tag_ids?.length)
    searchParams.set('tag_ids', tag_ids.join(','));
  if (limit) searchParams.set('limit', String(limit));

  return useQuery<UnifiedSearchResponse>({
    queryKey: ['recipe-search', q, meal_type, recipe_types, recipe_badge, exclude_nutritional_tag_ids, nutritional_tag_ids, tag_ids, limit],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/recipes/search/?${searchParams.toString()}`,
        UnifiedSearchResponseSchema,
      ),
    enabled: (q?.length ?? 0) >= 2 || !!recipe_types?.length || !!recipe_badge || !!exclude_nutritional_tag_ids?.length || !!nutritional_tag_ids?.length || !!meal_type,
    placeholderData: keepPreviousData,
  });
}

// ==========================================================================
// Recipe Suggestions
// ==========================================================================

export interface RecipeSuggestionsParams {
  mealType?: string;
  q?: string;
  limit?: number;
  nutritionalTagIds?: number[];
  excludeNutritionalTagIds?: number[];
  recipeTypes?: string[];
}

export function useRecipeSuggestions(params: RecipeSuggestionsParams) {
  const { mealType, q, limit = 10, excludeNutritionalTagIds, recipeTypes } = params;

  const searchParams = new URLSearchParams();
  if (mealType) searchParams.set('meal_type', mealType);
  if (q) searchParams.set('q', q);
  searchParams.set('limit', String(limit));
  if (excludeNutritionalTagIds?.length)
    searchParams.set('exclude_nutritional_tag_ids', excludeNutritionalTagIds.join(','));
  if (recipeTypes?.length)
    searchParams.set('recipe_types', recipeTypes.join(','));

  return useQuery<RecipeSuggestionsResponse>({
    queryKey: ['recipe-suggestions', mealType, q, limit, excludeNutritionalTagIds, recipeTypes],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/recipes/suggestions/?${searchParams.toString()}`,
        RecipeSuggestionsResponseSchema,
      ),
    enabled: (q?.length ?? 0) >= 2 || !!mealType || !!excludeNutritionalTagIds?.length || !!recipeTypes?.length,
    placeholderData: keepPreviousData,
  });
}

// ==========================================================================
// Popular Recipes
// ==========================================================================

export interface PopularRecipesParams {
  mealType?: string;
  limit?: number;
}

export function usePopularRecipes(params: PopularRecipesParams) {
  const { mealType, limit = 8 } = params;

  const searchParams = new URLSearchParams();
  if (mealType) searchParams.set('meal_type', mealType);
  searchParams.set('limit', String(limit));

  return useQuery<RecipePopularResponse>({
    queryKey: ['popular-recipes', mealType, limit],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/recipes/popular/?${searchParams.toString()}`,
        RecipePopularResponseSchema,
      ),
  });
}

// ==========================================================================
// Recently Used Recipes
// ==========================================================================

export function useRecentlyUsedRecipes(limit = 5) {
  return useQuery<RecentlyUsedResponse>({
    queryKey: ['recently-used-recipes', limit],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/recipes/recently-used/?limit=${limit}`,
        RecentlyUsedResponseSchema,
      ),
  });
}

// ==========================================================================
// Random Recipe Suggestion
// ==========================================================================

export function useRandomRecipeSuggestion(params: {
  mealType?: string;
  nutritionalTagIds?: number[];
  excludeNutritionalTagIds?: number[];
}) {
  const { mealType, excludeNutritionalTagIds } = params;

  const searchParams = new URLSearchParams();
  if (mealType) searchParams.set('meal_type', mealType);
  searchParams.set('random', 'true');
  searchParams.set('limit', '1');
  if (excludeNutritionalTagIds?.length)
    searchParams.set('exclude_nutritional_tag_ids', excludeNutritionalTagIds.join(','));

  // RecipeSuggestionsResponseSchema = z.array(...), result.data may be empty array — callers must guard with length > 0
  return useQuery<RecipeSuggestion[]>({
    queryKey: ['random-recipe-suggestion', mealType, excludeNutritionalTagIds],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/recipes/suggestions/?${searchParams.toString()}`,
        RecipeSuggestionsResponseSchema,
      ),
    enabled: false, // only fetch on demand via refetch()
  });
}

// ==========================================================================
// Cooking Schedule (Kochplan)
// ==========================================================================

export function useCookingSchedule(mealPlanId: number | undefined) {
  return useQuery<CookingSchedule>({
    queryKey: ['cooking-schedule', mealPlanId],
    queryFn: () => fetchJson(`${API_BASE}/${mealPlanId}/cooking-schedule/`, CookingScheduleSchema),
    enabled: mealPlanId !== undefined,
  });
}

// ==========================================================================
// Variant Item Batch & Factor Update
// ==========================================================================

export function useBatchCreateMealItems(mealPlanId: number, mealId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      items: MealItemVariantIn[],
    ) => {
      const validated = z.array(MealItemVariantInSchema).parse(items);
      const res = await fetch(
        `${API_BASE}/${mealPlanId}/meals/${mealId}/items/batch/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({ items: validated }),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `API error: ${res.status}`);
      }
      const data = await res.json();
      return z.array(MealItemSchema).parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

// ==========================================================================
// Collaborator Hooks
// ==========================================================================

export function useMealPlanCollaborators(planId: number) {
  return useQuery<MealPlanCollaborator[]>({
    queryKey: ['meal-plan', planId, 'collaborators'],
    queryFn: () =>
      fetchJson(`${API_BASE}/${planId}/collaborators/`, z.array(MealPlanCollaboratorSchema)),
    enabled: planId > 0,
  });
}

export function useAddMealPlanCollaborator(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { user_id: number; role?: string }) =>
      postJson(`${API_BASE}/${planId}/collaborators/`, payload, MealPlanCollaboratorSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId, 'collaborators'] });
    },
  });
}

export function useUpdateMealPlanCollaborator(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collabId, role }: { collabId: number; role: string }) =>
      patchJson(`${API_BASE}/${planId}/collaborators/${collabId}/`, { role }, MealPlanCollaboratorSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId, 'collaborators'] });
    },
  });
}

export function useRemoveMealPlanCollaborator(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collabId: number) =>
      deleteJson(`${API_BASE}/${planId}/collaborators/${collabId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId, 'collaborators'] });
    },
  });
}

// ==========================================================================
// ==========================================================================
// Intelligent Recipe Suggestions
// ==========================================================================

export function useIntelligentSuggestions(
  planId: number,
  mealId: number,
  aiEnhance = false,
) {
  const searchParams = new URLSearchParams();
  if (aiEnhance) searchParams.set('ai_enhance', 'true');

  return useQuery<IntelligentSuggestionsResponse>({
    queryKey: ['intelligent-suggestions', planId, mealId, aiEnhance],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/${planId}/meal/${mealId}/suggestions/?${searchParams.toString()}`,
        IntelligentSuggestionsResponseSchema,
      ),
    enabled: !!planId && !!mealId,
    staleTime: 30_000,
  });
}

// ==========================================================================
// Backward compatibility re-exports
// ==========================================================================

/** @deprecated Use useMealPlans */
export const useMealEvents = useMealPlans;

/** @deprecated Use useMealPlans with search filter */
export function useMealPlansSearch(search?: string, dateFrom?: string, dateTo?: string) {
  return (useMealPlans as (filters?: MealPlanFilterParams) => ReturnType<typeof useMealPlans>)({ search, date_from: dateFrom, date_to: dateTo });
}
/** @deprecated Use useMealPlan */
export const useMealEvent = useMealPlan;
/** @deprecated Use useCreateMealPlan */
export const useCreateMealEvent = useCreateMealPlan;
/** @deprecated Use useUpdateMealPlan */
export const useUpdateMealEvent = useUpdateMealPlan;
/** @deprecated Use useDeleteMealPlan */
export const useDeleteMealEvent = useDeleteMealPlan;
