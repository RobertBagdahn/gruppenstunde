import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRemoveMealItem } from '@/api/mealPlans';
import React from 'react';

vi.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost',
  parseApiResponse: vi.fn(),
  deleteJson: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Optimistic Removal & Rollback', () => {
  it('optimistically removes item from QueryClient cache before server responds', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const initialPlan = {
      id: 1,
      name: 'Test Plan',
      meals: [
        {
          id: 10,
          items: [
            { id: 101, recipe_title: 'Spaghetti', factor: 1 },
            { id: 102, recipe_title: 'Salat', factor: 1 },
          ],
        },
      ],
    };

    queryClient.setQueryData(['meal-plan', 1], initialPlan);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRemoveMealItem(1), { wrapper });

    await act(async () => {
      result.current.mutate(101);
    });

    const updatedPlan: any = queryClient.getQueryData(['meal-plan', 1]);
    expect(updatedPlan.meals[0].items.length).toBe(1);
    expect(updatedPlan.meals[0].items[0].id).toBe(102);
  });
});
