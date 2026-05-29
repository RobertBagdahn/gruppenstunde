/**
 * TanStack Query hook for the Food Dashboard API.
 * MUST stay in sync with backend/recipe/api/dashboard.py
 */
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';
import { FoodDashboardSchema, type FoodDashboard } from '@/schemas/dashboard';

export function useFoodDashboard() {
  return useQuery<FoodDashboard>({
    queryKey: ['food-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/food/dashboard/`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();
      return FoodDashboardSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}
