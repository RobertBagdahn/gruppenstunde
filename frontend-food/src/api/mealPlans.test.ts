import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MealPlanSchema } from '@/schemas/mealPlan';
import { parseApiResponse } from '@/lib/api';
import { useUpdateMealPlan } from './mealPlans';
import React from 'react';

describe('MealPlan PATCH response handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a successful response once and preserves manual norm portions', async () => {
    const response = new Response(
      JSON.stringify({
        id: 7,
        name: 'Sommerlager',
        slug: 'sommerlager',
        description: '',
        norm_portions: 12,
        norm_portions_manual: true,
        previous_norm_portions: 10,
        activity_factor: 1.5,
        reserve_factor: 1.1,
        budget_per_person_per_day: null,
        event_id: 4,
        event_name: 'Sommerlager',
        start_datetime: null,
        end_datetime: null,
        created_by_id: 3,
        owner_id: 3,
        owner_name: 'Leitung',
        visibility: 'private',
        created_at: '2026-09-06T10:00:00Z',
        updated_at: '2026-09-06T10:00:00Z',
        meals_count: 0,
        day_part_factors: {},
        meal_default_times: {},
        nutritional_tag_ids: [],
        nutritional_tag_names: [],
        is_template: false,
        is_owner: true,
        collaborators_count: 0,
        tags: [],
        has_group_members: true,
        group_members_count: 2,
        can_edit: true,
        can_delete: true,
      }),
      { status: 200 },
    );
    const jsonSpy = vi.spyOn(response, 'json');

    const result = await parseApiResponse(response, MealPlanSchema);

    expect(result.norm_portions).toBe(12);
    expect(result.norm_portions_manual).toBe(true);
    expect(jsonSpy).toHaveBeenCalledTimes(1);
  });

  it('preserves structured API errors without reading the response twice', async () => {
    const response = new Response(
      JSON.stringify({ detail: 'Manuelle Normportionen sind nur für eventgebundene Pläne möglich' }),
      { status: 400 },
    );
    const jsonSpy = vi.spyOn(response, 'json');

    await expect(parseApiResponse(response)).rejects.toMatchObject({
      status: 400,
      message: 'Manuelle Normportionen sind nur für eventgebundene Pläne möglich',
    });
    expect(jsonSpy).toHaveBeenCalledTimes(1);
  });

  it('uses the real update mutation and invalidates derived MealPlan queries', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const responseBody = {
      id: 7,
      name: 'Sommerlager',
      slug: 'sommerlager',
      description: '',
      norm_portions: 12,
      norm_portions_manual: true,
      previous_norm_portions: 10,
      activity_factor: 1.5,
      reserve_factor: 1.1,
      budget_per_person_per_day: null,
      event_id: 4,
      event_name: 'Sommerlager',
      start_datetime: null,
      end_datetime: null,
      created_by_id: 3,
      owner_id: 3,
      owner_name: 'Leitung',
      visibility: 'private',
      created_at: '2026-09-06T10:00:00Z',
      updated_at: '2026-09-06T10:00:00Z',
      meals_count: 0,
      day_part_factors: {},
      meal_default_times: {},
      nutritional_tag_ids: [],
      nutritional_tag_names: [],
      is_template: false,
      is_owner: true,
      collaborators_count: 0,
      tags: [],
      has_group_members: true,
      group_members_count: 2,
      can_edit: true,
      can_delete: true,
    };
    const response = new Response(JSON.stringify(responseBody), { status: 200 });
    const jsonSpy = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useUpdateMealPlan(7), { wrapper });

    result.current.mutate({ norm_portions: 12, norm_portions_manual: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jsonSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['cooking-schedule', 7] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meal-plan-suggestions', 7] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meal-plan', 7, 'nutrition'] });
  });
});
