/**
 * TanStack Query hooks for the Breakfast Wizard API.
 * MUST stay in sync with backend/supply/api/breakfast_catalog.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';
import {
  BreakfastCatalogSchema,
  BreakfastLeftoversOutSchema,
  DrinkRecipeSchema,
  WizardItemsResponseSchema,
  type BreakfastCatalog,
  type BreakfastLeftoversIn,
  type BreakfastLeftoversOut,
  type DrinkRecipe,
  type WizardItemsResponse,
} from '@/schemas/breakfast';
import { BreakfastDaySchema, type BreakfastDay } from '@/schemas/breakfast';
import { RefMealSchema, type RefMeal } from '@/schemas/mealPlan';

const SUPPLY_BASE = `${API_BASE_URL}/api/supply`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// ============================================================================
// Catalog Hook (3.2)
// ============================================================================

async function fetchBreakfastCatalog(): Promise<BreakfastCatalog> {
  const res = await fetch(`${SUPPLY_BASE}/breakfast-catalog/`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return BreakfastCatalogSchema.parse(data);
}

export function useBreakfastCatalog() {
  return useQuery({
    queryKey: ['breakfast-catalog'],
    queryFn: fetchBreakfastCatalog,
    staleTime: 5 * 60 * 1000, // 5 min — catalog changes rarely
  });
}

// ============================================================================
// Drink Recipes Hook
// ============================================================================

async function fetchDrinkRecipes(): Promise<DrinkRecipe[]> {
  const res = await fetch(`${SUPPLY_BASE}/breakfast-catalog/drinks/`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return z.array(DrinkRecipeSchema).parse(data);
}

export function useDrinkRecipes() {
  return useQuery({
    queryKey: ['breakfast-catalog', 'drinks'],
    queryFn: fetchDrinkRecipes,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Leftovers Mutation (3.3)
// ============================================================================

async function postBreakfastLeftovers(
  payload: BreakfastLeftoversIn,
): Promise<BreakfastLeftoversOut> {
  const res = await fetch(`${SUPPLY_BASE}/breakfast-leftovers/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return BreakfastLeftoversOutSchema.parse(data);
}

export function useBreakfastLeftovers() {
  return useMutation({
    mutationFn: postBreakfastLeftovers,
  });
}

// ============================================================================
// Save Wizard as RefMeal + MealItems (3.4)
// ============================================================================

const MEAL_PLAN_BASE = `${API_BASE_URL}/api/meal-plans`;

export interface WizardItemIn {
  recipe_id?: number | null;
  ingredient_id?: number | null;
  quantity?: number | null;
  measuring_unit_id?: number | null;
  display_name?: string | null;
  factor?: number;
}

export interface SaveWizardPayload {
  planId: number;
  /** Existing RefMeal id to update (null → create new) */
  refMealId: number | null;
  items: WizardItemIn[];
}

async function saveWizardRefMeal(payload: SaveWizardPayload): Promise<RefMeal> {
  const { planId, refMealId, items } = payload;

  if (refMealId) {
    // Update existing RefMeal
    const res = await fetch(`${MEAL_PLAN_BASE}/${planId}/ref-meals/${refMealId}/`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body}`);
    }
    return RefMealSchema.parse(await res.json());
  } else {
    // Create new RefMeal for breakfast
    const createRes = await fetch(`${MEAL_PLAN_BASE}/${planId}/ref-meals/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify({ meal_type: 'breakfast', items }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`API error ${createRes.status}: ${body}`);
    }
    return RefMealSchema.parse(await createRes.json());
  }
}

export function useSaveBreakfastWizard(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveWizardPayload) => saveWizardRefMeal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
    },
  });
}

// ============================================================================
// Save Wizard directly into a Meal (DirectMeal mode)
// ============================================================================

export interface SaveDirectMealPayload {
  planId: number;
  mealId: number;
  items: WizardItemIn[];
}

async function saveWizardDirectMeal(payload: SaveDirectMealPayload): Promise<WizardItemsResponse> {
  const { planId, mealId, items } = payload;

  const res = await fetch(`${MEAL_PLAN_BASE}/${planId}/meals/${mealId}/wizard-items/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return WizardItemsResponseSchema.parse(await res.json());
}

export function useSaveDirectMeal(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveDirectMealPayload) => saveWizardDirectMeal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
    },
  });
}

// ============================================================================
// Breakfast Day Tags (6.1–6.4)
// ============================================================================

async function fetchBreakfastDays(): Promise<BreakfastDay[]> {
  const res = await fetch(`${SUPPLY_BASE}/breakfast-days/`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return z.array(BreakfastDaySchema).parse(data);
}

export function useBreakfastDays() {
  return useQuery({
    queryKey: ['breakfast-days'],
    queryFn: fetchBreakfastDays,
    staleTime: 5 * 60 * 1000,
  });
}

async function createBreakfastDay(name: string): Promise<BreakfastDay> {
  const res = await fetch(`${SUPPLY_BASE}/breakfast-days/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return BreakfastDaySchema.parse(await res.json());
}

export function useCreateBreakfastDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createBreakfastDay(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakfast-days'] });
    },
  });
}

async function updateBreakfastDay(tagId: number, name: string): Promise<BreakfastDay> {
  const res = await fetch(`${SUPPLY_BASE}/breakfast-days/${tagId}/`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return BreakfastDaySchema.parse(await res.json());
}

export function useUpdateBreakfastDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, name }: { tagId: number; name: string }) => updateBreakfastDay(tagId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakfast-days'] });
    },
  });
}

async function deleteBreakfastDay(tagId: number, force = false): Promise<{ deleted: boolean; recipe_count: number }> {
  const res = await fetch(`${SUPPLY_BASE}/breakfast-days/${tagId}/?force=${force}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'X-CSRFToken': getCsrfToken(),
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useDeleteBreakfastDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, force = false }: { tagId: number; force?: boolean }) => deleteBreakfastDay(tagId, force),
    onSuccess: (data) => {
      if (data.deleted) {
        queryClient.invalidateQueries({ queryKey: ['breakfast-days'] });
      }
    },
  });
}

// ============================================================================
// Calculate Ingredient Kcal (for extra ingredients)
// ============================================================================

const CalculateIngredientKcalResponseSchema = z.object({
  items: z.array(
    z.object({
      ingredient_id: z.number(),
      energy_kcal: z.number().nullable(),
    }),
  ),
});
type CalculateIngredientKcalResponse = z.infer<typeof CalculateIngredientKcalResponseSchema>;

async function calculateIngredientKcal(
  mealPlanId: number,
  items: Array<{ ingredient_id: number; quantity_g: number }>,
): Promise<CalculateIngredientKcalResponse> {
  const PLANNER_BASE = `${API_BASE_URL}/api/meal-plans`;
  const res = await fetch(`${PLANNER_BASE}/${mealPlanId}/calculate-ingredient-kcal/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return CalculateIngredientKcalResponseSchema.parse(data);
}

export function useCalculateIngredientKcal(mealPlanId: number) {
  return useMutation({
    mutationFn: (items: Array<{ ingredient_id: number; quantity_g: number }>) =>
      calculateIngredientKcal(mealPlanId, items),
  });
}

// ============================================================================
// Create Ingredient (Task 18.1)
// ============================================================================

interface CreateIngredientPayload {
  name: string;
  description?: string;
  visibility?: 'private' | 'shared';
  shared_group_ids?: number[];
  tag_ids?: number[];
}

async function createIngredient(
  payload: CreateIngredientPayload,
): Promise<any> {
  const SUPPLY_BASE_URL = `${API_BASE_URL}/api/supplies`;
  const res = await fetch(`${SUPPLY_BASE_URL}/ingredients/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create ingredient: ${res.status} ${body}`);
  }
  return res.json();
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIngredient,
    onSuccess: () => {
      // Refresh breakfast catalog after creating ingredient
      queryClient.invalidateQueries({ queryKey: ['breakfast-catalog'] });
    },
  });
}

// ============================================================================
// Create Recipe (Task 18.2)
// ============================================================================

interface CreateRecipePayload {
  title: string;
  description?: string;
  summary?: string;
  recipe_type?: string;
  portions?: number;
  visibility?: 'private' | 'shared' | 'group' | 'public';
  shared_group_ids?: number[];
  tag_ids?: number[];
  recipe_items?: any[];
  website?: string;
  form_loaded_at?: number;
}

async function createRecipe(
  payload: CreateRecipePayload,
): Promise<any> {
  const RECIPES_BASE_URL = `${API_BASE_URL}/api/recipes`;
  const res = await fetch(`${RECIPES_BASE_URL}/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create recipe: ${res.status} ${body}`);
  }
  return res.json();
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      // Refresh breakfast catalog after creating recipe
      queryClient.invalidateQueries({ queryKey: ['breakfast-catalog'] });
    },
  });
}
