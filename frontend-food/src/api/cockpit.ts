/**
 * TanStack Query hooks for the Cockpit & HealthRule API.
 * MUST stay in sync with backend/recipe/api/cockpit.py
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  HealthRuleSchema,
  CockpitDashboardSchema,
  type HealthRule,
  type CockpitDashboard,
} from '@/schemas/cockpit';

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

// ==========================================================================
// HealthRule Hooks
// ==========================================================================

export function useHealthRules() {
  return useQuery<HealthRule[]>({
    queryKey: ['health-rules'],
    queryFn: () => fetchJson(`${API_BASE_URL}/api/health-rules/`, z.array(HealthRuleSchema)),
    staleTime: 10 * 60 * 1000, // rules change rarely
  });
}

// ==========================================================================
// Cockpit Dashboard Hooks
// ==========================================================================

export function useMealPlanCockpit(mealPlanId: number) {
  return useQuery<CockpitDashboard>({
    queryKey: ['cockpit', 'meal-plan', mealPlanId],
    queryFn: () =>
      fetchJson(
        `/api/meal-plans/${mealPlanId}/cockpit/`,
        CockpitDashboardSchema,
      ),
    enabled: mealPlanId > 0,
  });
}

export function useDayCockpit(mealPlanId: number, date: string) {
  return useQuery<CockpitDashboard>({
    queryKey: ['cockpit', 'meal-plan', mealPlanId, 'day', date],
    queryFn: () =>
      fetchJson(
        `/api/meal-plans/${mealPlanId}/cockpit/day/?date=${date}`,
        CockpitDashboardSchema,
      ),
    enabled: mealPlanId > 0 && !!date,
  });
}

export function useMealCockpit(mealId: number) {
  return useQuery<CockpitDashboard>({
    queryKey: ['cockpit', 'meal', mealId],
    queryFn: () =>
      fetchJson(`/api/meals/${mealId}/cockpit/`, CockpitDashboardSchema),
    enabled: mealId > 0,
  });
}

// Backward compatibility
/** @deprecated Use useMealPlanCockpit */
export const useMealEventCockpit = useMealPlanCockpit;
