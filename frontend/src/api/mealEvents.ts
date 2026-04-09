/**
 * TanStack Query hooks for the MealEvent API.
 * MUST stay in sync with backend/planner/api/meal_plan.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MealEventSchema,
  MealEventDetailSchema,
  MealSchema,
  MealItemSchema,
  NutritionSummarySchema,
  ShoppingListItemSchema,
  RecipeSearchResultSchema,
  type MealEvent,
  type MealEventDetail,
  type NutritionSummary,
  type ShoppingListItem,
  type RecipeSearchResult,
} from '@/schemas/mealEvent';
import { z } from 'zod';

const API_BASE = '/api/meal-events';

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
// MealEvent Hooks
// ==========================================================================

export function useMealEvents() {
  return useQuery<MealEvent[]>({
    queryKey: ['meal-events'],
    queryFn: () => fetchJson(`${API_BASE}/`, z.array(MealEventSchema)),
  });
}

export function useMealEvent(id: number) {
  return useQuery<MealEventDetail>({
    queryKey: ['meal-event', id],
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, MealEventDetailSchema),
    enabled: id > 0,
  });
}

export function useCreateMealEvent() {
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
    }) => postJson(`${API_BASE}/`, body, MealEventSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-events'] });
    },
  });
}

export function useUpdateMealEvent(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      description?: string;
      norm_portions?: number;
      activity_factor?: number;
      reserve_factor?: number;
    }) => patchJson(`${API_BASE}/${id}/`, body, MealEventSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-events'] });
      queryClient.invalidateQueries({ queryKey: ['meal-event', id] });
    },
  });
}

export function useDeleteMealEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${API_BASE}/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-events'] });
    },
  });
}

// ==========================================================================
// Day Hooks (convenience: add/remove all default meals for a date)
// ==========================================================================

export function useAddDay(mealEventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string }) =>
      postJson(`${API_BASE}/${mealEventId}/days/`, body, z.array(MealSchema)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-event', mealEventId] });
    },
  });
}

export function useRemoveDay(mealEventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) =>
      deleteJson(`${API_BASE}/${mealEventId}/days/?date=${date}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-event', mealEventId] });
    },
  });
}

// ==========================================================================
// Meal Hooks
// ==========================================================================

export function useAddMeal(mealEventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      start_datetime: string;
      end_datetime: string;
      meal_type: string;
      day_part_factor?: number | null;
    }) => postJson(`${API_BASE}/${mealEventId}/meals/`, body, MealSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-event', mealEventId] });
    },
  });
}

export function useRemoveMeal(mealEventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mealId: number) =>
      deleteJson(`${API_BASE}/${mealEventId}/meals/${mealId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-event', mealEventId] });
    },
  });
}

// ==========================================================================
// MealItem Hooks
// ==========================================================================

export function useAddMealItem(mealEventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealId,
      ...body
    }: {
      mealId: number;
      recipe_id: number;
      factor?: number;
    }) => postJson(`${API_BASE}/${mealEventId}/meals/${mealId}/items/`, body, MealItemSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-event', mealEventId] });
    },
  });
}

export function useRemoveMealItem(mealEventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      deleteJson(`${API_BASE}/${mealEventId}/meal-items/${itemId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-event', mealEventId] });
    },
  });
}

// ==========================================================================
// Nutrition & Shopping List
// ==========================================================================

export function useNutritionSummary(mealEventId: number) {
  return useQuery<NutritionSummary>({
    queryKey: ['meal-event', mealEventId, 'nutrition'],
    queryFn: () =>
      fetchJson(`${API_BASE}/${mealEventId}/nutrition-summary/`, NutritionSummarySchema),
    enabled: mealEventId > 0,
  });
}

export function useShoppingList(mealEventId: number) {
  return useQuery<ShoppingListItem[]>({
    queryKey: ['meal-event', mealEventId, 'shopping-list'],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/${mealEventId}/shopping-list/`,
        z.array(ShoppingListItemSchema),
      ),
    enabled: mealEventId > 0,
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

// ==========================================================================
// Backward compatibility re-exports
// ==========================================================================

/** @deprecated Use useMealEvents */
export const useMealPlans = useMealEvents;
/** @deprecated Use useMealEvent */
export const useMealPlan = useMealEvent;
/** @deprecated Use useCreateMealEvent */
export const useCreateMealPlan = useCreateMealEvent;
/** @deprecated Use useUpdateMealEvent */
export const useUpdateMealPlan = useUpdateMealEvent;
/** @deprecated Use useDeleteMealEvent */
export const useDeleteMealPlan = useDeleteMealEvent;
