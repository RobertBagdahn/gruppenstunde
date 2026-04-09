/**
 * TanStack Query hooks for the Cockpit & HealthRule API.
 * MUST stay in sync with backend/recipe/api/cockpit.py
 */
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
    queryFn: () => fetchJson('/api/health-rules/', z.array(HealthRuleSchema)),
    staleTime: 10 * 60 * 1000, // rules change rarely
  });
}

// ==========================================================================
// Cockpit Dashboard Hooks
// ==========================================================================

export function useMealEventCockpit(mealEventId: number) {
  return useQuery<CockpitDashboard>({
    queryKey: ['cockpit', 'meal-event', mealEventId],
    queryFn: () =>
      fetchJson(
        `/api/meal-events/${mealEventId}/cockpit/`,
        CockpitDashboardSchema,
      ),
    enabled: mealEventId > 0,
  });
}

export function useDayCockpit(mealEventId: number, date: string) {
  return useQuery<CockpitDashboard>({
    queryKey: ['cockpit', 'meal-event', mealEventId, 'day', date],
    queryFn: () =>
      fetchJson(
        `/api/meal-events/${mealEventId}/cockpit/day/?date=${date}`,
        CockpitDashboardSchema,
      ),
    enabled: mealEventId > 0 && !!date,
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
