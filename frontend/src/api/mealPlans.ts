/**
 * TanStack Query hooks for the MealPlan API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MealPlanSchema,
  MealPlanDetailSchema,
  MealDaySchema,
  MealSchema,
  MealItemSchema,
  NutritionSummarySchema,
  ShoppingListItemSchema,
  RecipeSearchResultSchema,
  type MealPlan,
  type MealPlanDetail,
  type NutritionSummary,
  type ShoppingListItem,
  type RecipeSearchResult,
} from '@/schemas/mealPlan';
import { z } from 'zod';

const API_BASE = '/api/meal-plans';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
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

async function patchJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
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

export function useMealPlans() {
  return useQuery<MealPlan[]>({
    queryKey: ['meal-plans'],
    queryFn: () => fetchJson(`${API_BASE}/`, z.array(MealPlanSchema)),
  });
}

export function useMealPlan(id: number) {
  return useQuery<MealPlanDetail>({
    queryKey: ['meal-plan', id],
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, MealPlanDetailSchema),
    enabled: id > 0,
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      norm_portions?: number;
      activity_factor?: number;
      reserve_factor?: number;
      event_id?: number | null;
      start_date?: string | null;
      num_days?: number;
    }) => postJson(`${API_BASE}/`, body, MealPlanSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
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
      activity_factor?: number;
      reserve_factor?: number;
    }) => patchJson(`${API_BASE}/${id}/`, body, MealPlanSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', id] });
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

// ==========================================================================
// MealDay Hooks
// ==========================================================================

export function useAddDay(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string }) =>
      postJson(`${API_BASE}/${mealPlanId}/days/`, body, MealDaySchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useRemoveDay(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dayId: number) =>
      deleteJson(`${API_BASE}/${mealPlanId}/days/${dayId}/`),
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
    mutationFn: ({
      dayId,
      ...body
    }: {
      dayId: number;
      meal_type: string;
      time_start?: string | null;
      time_end?: string | null;
      day_part_factor?: number | null;
    }) => postJson(`${API_BASE}/${mealPlanId}/days/${dayId}/meals/`, body, MealSchema),
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
      recipe_id: number;
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

// ==========================================================================
// Nutrition & Shopping List
// ==========================================================================

export function useNutritionSummary(mealPlanId: number) {
  return useQuery<NutritionSummary>({
    queryKey: ['meal-plan', mealPlanId, 'nutrition'],
    queryFn: () =>
      fetchJson(`${API_BASE}/${mealPlanId}/nutrition-summary/`, NutritionSummarySchema),
    enabled: mealPlanId > 0,
  });
}

export function useShoppingList(mealPlanId: number) {
  return useQuery<ShoppingListItem[]>({
    queryKey: ['meal-plan', mealPlanId, 'shopping-list'],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/${mealPlanId}/shopping-list/`,
        z.array(ShoppingListItemSchema),
      ),
    enabled: mealPlanId > 0,
  });
}

// ==========================================================================
// Recipe Search
// ==========================================================================

export function useRecipeSearch(query: string) {
  return useQuery<RecipeSearchResult[]>({
    queryKey: ['recipe-search', query],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/recipes/search/?q=${encodeURIComponent(query)}`,
        z.array(RecipeSearchResultSchema),
      ),
    enabled: query.length >= 2,
  });
}
