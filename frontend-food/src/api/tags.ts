/**
 * TanStack Query hooks for the Tag API.
 */
import { useQuery } from '@tanstack/react-query';
import { TagSchema, ScoutLevelSchema, type Tag, type ScoutLevel } from '@/schemas/content';
import { z } from 'zod';

const API_BASE = '/api';

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => fetchJson(`${API_BASE}/tags/`, z.array(TagSchema)),
    staleTime: 30 * 60 * 1000,
  });
}

export function useScoutLevels() {
  return useQuery<ScoutLevel[]>({
    queryKey: ['scoutLevels'],
    queryFn: () => fetchJson(`${API_BASE}/scout-levels/`, z.array(ScoutLevelSchema)),
    staleTime: 30 * 60 * 1000,
  });
}
