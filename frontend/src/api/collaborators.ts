/**
 * TanStack Query hooks for ContentCollaborator API.
 * MUST stay in sync with backend/content/api/collaborators.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  ContentCollaboratorOutSchema,
  ContentCollaboratorInSchema,
  ContentCollaboratorUpdateInSchema,
} from '@/schemas/collaborator';
import type { ContentCollaboratorIn, ContentCollaboratorUpdateIn } from '@/schemas/collaborator';
import { API_BASE_URL } from '@/lib/api';

const API_BASE = `${API_BASE_URL}/api/content-collaborators`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return schema.parse(await res.json());
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return schema.parse(await res.json());
}

async function patchJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return schema.parse(await res.json());
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-CSRFToken': getCsrfToken() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
}

export function useContentCollaborators(contentTypeApp: string, contentTypeModel: string, objectId: number) {
  return useQuery({
    queryKey: ['content-collaborators', contentTypeApp, contentTypeModel, objectId] as const,
    queryFn: () =>
      fetchJson(
        `${API_BASE}/?content_type_app=${contentTypeApp}&content_type_model=${contentTypeModel}&object_id=${objectId}`,
        z.array(ContentCollaboratorOutSchema),
      ),
    enabled: objectId > 0,
  });
}

export function useAddCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ContentCollaboratorIn) =>
      postJson(`${API_BASE}/`, input, ContentCollaboratorOutSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-collaborators'] });
    },
  });
}

export function useUpdateCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: ContentCollaboratorUpdateIn }) =>
      patchJson(`${API_BASE}/${id}/`, role, ContentCollaboratorOutSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-collaborators'] });
    },
  });
}

export function useRemoveCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${API_BASE}/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-collaborators'] });
    },
  });
}
