import { API_BASE_URL, fetchWithCsrf, parseApiResponse } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecipeFolderSchema, type RecipeFolder, type RecipeFolderCreate, type RecipeFolderUpdate } from '@/schemas/recipeFolder';

const FOLDER_BASE = `${API_BASE_URL}/api/recipe-folders`;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  return parseApiResponse<T>(res);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetchWithCsrf(url, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return parseApiResponse<T>(res);
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetchWithCsrf(url, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return parseApiResponse<T>(res);
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetchWithCsrf(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  await parseApiResponse(res);
}

export function useRecipeFolders() {
  return useQuery({
    queryKey: ['recipe-folders'] as const,
    queryFn: async () => {
      const data = await fetchJson<RecipeFolder[]>(`${FOLDER_BASE}/`);
      return RecipeFolderSchema.array().parse(data);
    },
  });
}

export function useCreateRecipeFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecipeFolderCreate) => postJson<RecipeFolder>(`${FOLDER_BASE}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-folders'] });
    },
  });
}

export function useUpdateRecipeFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecipeFolderUpdate }) =>
      patchJson<RecipeFolder>(`${FOLDER_BASE}/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-folders'] });
    },
  });
}

export function useDeleteRecipeFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${FOLDER_BASE}/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-folders'] });
    },
  });
}
