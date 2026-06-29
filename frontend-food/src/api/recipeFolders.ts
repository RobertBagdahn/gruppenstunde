import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecipeFolderSchema, type RecipeFolder, type RecipeFolderCreate, type RecipeFolderUpdate } from '@/schemas/recipeFolder';

const FOLDER_BASE = `${API_BASE_URL}/api/recipe-folders`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-CSRFToken': getCsrfToken() },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
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
