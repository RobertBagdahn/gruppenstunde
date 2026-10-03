/**
 * TanStack Query hooks for the buffet builder.
 * MUST stay in sync with backend/planner/api/buffet.py and
 * backend/supply/api/buffet_catalog.py
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, parseApiResponse } from '@/lib/api';
import { invalidateMealPlanQueries } from '@/api/mealPlans';
import {
  BuffetTemplateSchema,
  BuffetCatalogSchema,
  BuffetCatalogSearchItemSchema,
  BuffetStateSchema,
  BuffetResultSchema,
  BuffetSaveInSchema,
  type BuffetCatalogSearchItem,
  type BuffetResult,
  type BuffetSaveIn,
} from '@/schemas/buffet';
import { z } from 'zod';

const MEAL_PLANS_BASE = `${API_BASE_URL}/api/meal-plans`;
const SUPPLY_BASE = `${API_BASE_URL}/api/supply`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  return parseApiResponse<T>(res, schema);
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  return parseApiResponse<T>(res, schema);
}

// ==========================================================================
// Buffet templates
// ==========================================================================

export function useBuffetTemplates(mealType?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['buffet-templates', mealType] as const,
    queryFn: () =>
      fetchJson(
        `${MEAL_PLANS_BASE}/buffet-templates/${mealType ? `?meal_type=${encodeURIComponent(mealType)}` : ''}`,
        z.array(BuffetTemplateSchema),
      ),
    enabled: options.enabled ?? true,
  });
}

// ==========================================================================
// Buffet catalog
// ==========================================================================

export function useBuffetCatalog(templateSlug: string | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['buffet-catalog', templateSlug] as const,
    queryFn: () =>
      fetchJson(
        `${SUPPLY_BASE}/buffet-catalog/${templateSlug ? `?template=${encodeURIComponent(templateSlug)}` : ''}`,
        BuffetCatalogSchema,
      ),
    enabled: (options.enabled ?? true) && templateSlug !== null,
  });
}

// ==========================================================================
// Buffet state (saved selection for a meal)
// ==========================================================================

export interface BuffetCatalogSearchInput {
  q: string;
  role: string;
  mealType: string;
  kind: 'all' | 'ingredient' | 'recipe';
  recipeType?: string;
  includeNonStandalone: boolean;
  excludeAlcohol: boolean;
}

export function useBuffetCatalogSearch(
  input: BuffetCatalogSearchInput,
  options: { enabled?: boolean } = {},
) {
  const query = input.q.trim();
  const params = new URLSearchParams({
    q: query,
    role: input.role,
    meal_type: input.mealType,
    kind: input.kind,
    include_non_standalone: String(input.includeNonStandalone),
    exclude_alcohol: String(input.excludeAlcohol),
    limit: '30',
  });
  if (input.recipeType) params.set('recipe_type', input.recipeType);

  return useQuery({
    queryKey: ['buffet-catalog-search', { ...input, q: query }] as const,
    queryFn: async (): Promise<BuffetCatalogSearchItem[]> =>
      fetchJson(`${SUPPLY_BASE}/buffet-catalog/search/?${params.toString()}`, z.array(BuffetCatalogSearchItemSchema)),
    enabled: (options.enabled ?? true) && query.length >= 2,
  });
}

export function useBuffetState(planId: number, mealId: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['buffet-state', planId, mealId] as const,
    queryFn: () => fetchJson(`${MEAL_PLANS_BASE}/${planId}/meals/${mealId}/buffet/`, BuffetStateSchema),
    enabled: (options.enabled ?? true) && planId > 0 && mealId > 0,
  });
}

// ==========================================================================
// Preview (debounced dry-run)
// ==========================================================================

export interface BuffetPreviewInput {
  templateId: number;
  selections: BuffetSaveIn['selections'];
  roleAmounts: BuffetSaveIn['role_amounts'];
}

/**
 * Debounced buffet preview. Call `preview(input)` on every selection change;
 * only the latest call after `delayMs` actually reaches the backend, and a
 * response from a superseded call is discarded.
 */
export function useBuffetPreview(planId: number, mealId: number, delayMs = 300) {
  const [result, setResult] = useState<BuffetResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const preview = useCallback(
    (input: BuffetPreviewInput) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const requestId = ++requestIdRef.current;
      setIsPending(true);
      timerRef.current = setTimeout(() => {
        void (async () => {
          try {
            const data = await postJson(
              `${MEAL_PLANS_BASE}/${planId}/meals/${mealId}/buffet/`,
              {
                template_id: input.templateId,
                selections: input.selections,
                role_amounts: input.roleAmounts,
                dry_run: true,
              },
              BuffetResultSchema,
            );
            if (requestId === requestIdRef.current) {
              setResult(data);
              setError(null);
            }
          } catch (err) {
            if (requestId === requestIdRef.current) {
              setError(err instanceof Error ? err : new Error('Vorschau fehlgeschlagen'));
            }
          } finally {
            if (requestId === requestIdRef.current) setIsPending(false);
          }
        })();
      }, delayMs);
    },
    [planId, mealId, delayMs],
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    requestIdRef.current += 1;
    setResult(null);
    setIsPending(false);
    setError(null);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { preview, result, isPending, error, reset };
}

// ==========================================================================
// Save
// ==========================================================================

export function useSaveBuffet(planId: number, mealId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BuffetPreviewInput) => {
      const payload = BuffetSaveInSchema.parse({
        template_id: input.templateId,
        selections: input.selections,
        role_amounts: input.roleAmounts,
        dry_run: false,
      });
      return postJson(`${MEAL_PLANS_BASE}/${planId}/meals/${mealId}/buffet/`, payload, BuffetResultSchema);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buffet-state', planId, mealId] });
      return invalidateMealPlanQueries(queryClient, planId);
    },
  });
}
