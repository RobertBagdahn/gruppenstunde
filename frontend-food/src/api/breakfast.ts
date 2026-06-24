/**
 * TanStack Query hooks for the Breakfast Wizard API.
 * MUST stay in sync with backend/supply/api/breakfast_catalog.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';
import {
  BreakfastCatalogSchema,
  BreakfastLeftoversOutSchema,
  type BreakfastCatalog,
  type BreakfastLeftoversIn,
  type BreakfastLeftoversOut,
} from '@/schemas/breakfast';
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
    if (!res.ok) throw new Error(`API error: ${res.status}`);
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
    if (!createRes.ok) throw new Error(`API error: ${createRes.status}`);
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
