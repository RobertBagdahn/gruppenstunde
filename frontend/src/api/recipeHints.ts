/**
 * TanStack Query hooks for the RecipeHint CRUD API (Staff-only).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { RecipeHintSchema, type RecipeHint } from '@/schemas/recipe';

const API_BASE = '/api/recipe-hints';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

const PaginatedRecipeHintsSchema = z.object({
  items: z.array(RecipeHintSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export type PaginatedRecipeHints = z.infer<typeof PaginatedRecipeHintsSchema>;

export interface RecipeHintFilters {
  page?: number;
  page_size?: number;
  parameter?: string;
  hint_level?: string;
  recipe_type?: string;
  recipe_objective?: string;
}

export type RecipeHintInput = Omit<RecipeHint, 'id'>;

export function useRecipeHints(filters: RecipeHintFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.parameter) params.set('parameter', filters.parameter);
  if (filters.hint_level) params.set('hint_level', filters.hint_level);
  if (filters.recipe_type) params.set('recipe_type', filters.recipe_type);
  if (filters.recipe_objective) params.set('recipe_objective', filters.recipe_objective);

  const url = `${API_BASE}/?${params.toString()}`;
  return useQuery({
    queryKey: ['recipe-hints', filters],
    queryFn: async () => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return PaginatedRecipeHintsSchema.parse(data);
    },
  });
}

export function useCreateRecipeHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecipeHintInput) => {
      const res = await fetch(`${API_BASE}/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return RecipeHintSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipe-hints'] }),
  });
}

export function useUpdateRecipeHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<RecipeHint> & { id: number }) => {
      const res = await fetch(`${API_BASE}/${id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return RecipeHintSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipe-hints'] }),
  });
}

export function useDeleteRecipeHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipe-hints'] }),
  });
}
