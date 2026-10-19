/**
 * TanStack Query hooks for event shopping trips: overview, plan, trips, rules, freeze and diff.
 * MUST stay in sync with backend/shopping/api_trips.py and the trip endpoints of backend/shopping/api.py
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { API_BASE_URL, fetchWithCsrf, parseApiResponse } from '@/lib/api';
import { ShoppingListDetailSchema, ShoppingListSchema } from '@/schemas/shoppingList';
import {
  AllocationRuleInputSchema,
  AllocationRuleSchema,
  CreatedEventSchema,
  PaginatedManageableEventsSchema,
  PaginatedShoppingEventsSchema,
  TripDiffSchema,
  TripInputSchema,
  TripPlanSchema,
  type AllocationRuleInput,
  type TripInput,
} from '@/schemas/shoppingTrip';
import { deleteJson, fetchJson, patchJson, postJson } from './shoppingLists';

const EVENTS_BASE = `${API_BASE_URL}/api/shopping-events`;
const LISTS_BASE = `${API_BASE_URL}/api/shopping-lists`;
const RULES_BASE = `${API_BASE_URL}/api/shopping-rules`;

/** Every change to trips, rules or lists moves the preview and the overview. */
function invalidateTripData(queryClient: QueryClient, eventSlug?: string | null, listId?: number) {
  queryClient.invalidateQueries({ queryKey: eventSlug ? ['shopping-plan', eventSlug] : ['shopping-plan'] });
  queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
  queryClient.invalidateQueries({ queryKey: ['shopping-events'] });
  if (listId !== undefined) {
    queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
    queryClient.invalidateQueries({ queryKey: ['shopping-list-board', listId] });
    queryClient.invalidateQueries({ queryKey: ['shopping-plan-diff', listId] });
  }
}

// --- Overview ---

export function useShoppingEvents(page = 1, pageSize = 20, includePast = false, enabled = true) {
  return useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryKey: ['shopping-events', page, pageSize, includePast] as const,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (includePast) params.set('include_past', 'true');
      return fetchJson(`${EVENTS_BASE}/?${params.toString()}`, PaginatedShoppingEventsSchema);
    },
  });
}

/** Events the user manages, for the "Event verknüpfen" dialog. */
export function useManageableEvents(search = '', page = 1, pageSize = 10, enabled = true) {
  return useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryKey: ['shopping-events-manageable', search, page, pageSize] as const,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set('search', search);
      return fetchJson(`${EVENTS_BASE}/manageable/?${params.toString()}`, PaginatedManageableEventsSchema);
    },
  });
}

// --- Plan ---

export function useTripPlan(eventSlug: string, enabled = true) {
  return useQuery({
    enabled: enabled && eventSlug !== '',
    queryKey: ['shopping-plan', eventSlug] as const,
    queryFn: () => fetchJson(`${EVENTS_BASE}/${eventSlug}/plan/`, TripPlanSchema),
  });
}

export function useCreateTrip(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TripInput) =>
      postJson(`${EVENTS_BASE}/${eventSlug}/trips/`, TripInputSchema.parse(input), ShoppingListSchema),
    onSuccess: () => invalidateTripData(queryClient, eventSlug),
  });
}

export interface TripUpdate {
  name?: string;
  store_id?: number;
  scheduled_at?: string;
}

export function useUpdateTrip(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, ...body }: TripUpdate & { listId: number }) =>
      patchJson(`${LISTS_BASE}/${listId}/`, body, ShoppingListSchema),
    onSuccess: (_data, variables) => invalidateTripData(queryClient, eventSlug, variables.listId),
  });
}

export function useDeleteTrip(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: number) => deleteJson(`${LISTS_BASE}/${listId}/`),
    onSuccess: (_data, listId) => invalidateTripData(queryClient, eventSlug, listId),
  });
}

/** "Liste erstellen": stores the allocated demand as entries; a second call answers 409. */
export function useMaterializeTrip(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: number) => postJson(`${LISTS_BASE}/${listId}/materialize/`, {}, ShoppingListDetailSchema, listId),
    onSuccess: (_data, listId) => invalidateTripData(queryClient, eventSlug, listId),
  });
}

// --- Rules ---

export function useCreateRule(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AllocationRuleInput) =>
      postJson(`${EVENTS_BASE}/${eventSlug}/rules/`, AllocationRuleInputSchema.parse(input), AllocationRuleSchema),
    onSuccess: () => invalidateTripData(queryClient, eventSlug),
  });
}

export function useDeleteRule(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => deleteJson(`${RULES_BASE}/${ruleId}/`),
    onSuccess: () => invalidateTripData(queryClient, eventSlug),
  });
}

// --- Plan diff of a created trip ---

export function usePlanDiff(listId: number, enabled = true) {
  return useQuery({
    enabled: enabled && listId > 0,
    queryKey: ['shopping-plan-diff', listId] as const,
    queryFn: () => fetchJson(`${LISTS_BASE}/${listId}/plan-diff/`, TripDiffSchema, listId),
  });
}

export function useApplyPlanDiff(eventSlug: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: number) =>
      postJson(`${LISTS_BASE}/${listId}/plan-diff/apply/`, {}, ShoppingListDetailSchema, listId),
    onSuccess: (_data, listId) => invalidateTripData(queryClient, eventSlug, listId),
  });
}

// --- Linking a meal plan to an event ---

async function putJson<T>(url: string, body: unknown, schema: { parse(data: unknown): T }): Promise<T> {
  return parseApiResponse(await fetchWithCsrf(url, { method: 'PUT', body: JSON.stringify(body) }), schema);
}

const MEAL_PLANS_BASE = `${API_BASE_URL}/api/meal-plans`;

/** Links an existing plan to an event; 409 when the plan already belongs to one. */
export function useLinkMealPlanEvent(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: number) =>
      putJson(`${MEAL_PLANS_BASE}/${mealPlanId}/event/`, { event_id: eventId }, { parse: (data) => data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-events'] });
    },
  });
}

export interface NewEventForPlan {
  name: string;
  start_date: string | null;
  end_date: string | null;
}

/** Creates a non-public event and links the plan atomically; the backend answers 409 without creating anything. */
export function useCreateEventForMealPlan(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewEventForPlan) =>
      postJson(`${API_BASE_URL}/api/events/`, { ...input, is_public: false, meal_plan_id: mealPlanId }, CreatedEventSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-events'] });
    },
  });
}
