/**
 * TanStack Query hooks for the RefMeal API.
 * MUST stay in sync with backend/planner/api/ref_meal.py
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefMealSchema,
  type RefMeal,
  type RefMealCreateIn,
  type RefMealUpdateIn,
  type LinkMealIn,
} from '@/schemas/mealPlan';
import { z } from 'zod';

const API_BASE = `${API_BASE_URL}/api/meal-plans`;

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

async function postJson(url: string, body?: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function putJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'PUT',
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
  return res.json();
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
// RefMeal Hooks
// ==========================================================================

export function useRefMeals(planId: number) {
  return useQuery<RefMeal[]>({
    queryKey: ['refMeals', planId],
    queryFn: () => fetchJson(`${API_BASE}/${planId}/ref-meals/`, z.array(RefMealSchema)),
  });
}

export function useRefMeal(planId: number, refMealId: number) {
  return useQuery<RefMeal>({
    queryKey: ['refMeal', planId, refMealId],
    queryFn: () => fetchJson(`${API_BASE}/${planId}/ref-meals/${refMealId}/`, RefMealSchema),
    enabled: refMealId > 0,
  });
}

export function useCreateRefMeal(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RefMealCreateIn) =>
      postJson(`${API_BASE}/${planId}/ref-meals/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
    },
  });
}

export function useUpdateRefMeal(planId: number, refMealId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RefMealUpdateIn) =>
      putJson(`${API_BASE}/${planId}/ref-meals/${refMealId}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
      queryClient.invalidateQueries({ queryKey: ['refMeal', planId, refMealId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
    },
  });
}

export function useDeleteRefMeal(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refMealId: number) =>
      deleteJson(`${API_BASE}/${planId}/ref-meals/${refMealId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
    },
  });
}

export function useSyncRefMeal(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (refMealId: number) => {
      const result = await postJson(`${API_BASE}/${planId}/ref-meals/${refMealId}/sync`);
      return result as { synced_meals: number };
    },
    onSuccess: () => {
      // Invalidate all queries that show meal contents so changes appear immediately
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
      queryClient.invalidateQueries({ queryKey: ['meals', planId] });
    },
  });
}

export function useLinkMeal(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mealId, data }: { mealId: number; data: LinkMealIn }) =>
      postJson(`${API_BASE}/${planId}/meals/${mealId}/link`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
    },
  });
}

export function useUnlinkMeal(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mealId: number) =>
      postJson(`${API_BASE}/${planId}/meals/${mealId}/unlink`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
    },
  });
}

export function useLinkAllMeals(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mealType: string) =>
      postJson(`${API_BASE}/${planId}/meals/link-all?meal_type=${mealType}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
    },
  });
}
