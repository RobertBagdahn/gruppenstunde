/**
 * TanStack Query mutations for the AI API.
 */
import { useMutation } from '@tanstack/react-query';
import {
  AiImproveTextSchema,
  AiSuggestTagsSchema,
  AiRefurbishSchema,
  type AiImproveText,
  type AiSuggestTags,
  type AiRefurbish,
} from '@/schemas/idea';
import { z } from 'zod';

const API_BASE = '/api/ai';

async function postJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const detail = errBody?.detail ?? `${res.status} ${res.statusText}`;
    throw new Error(detail);
  }
  const data = await res.json();
  return schema.parse(data);
}

export function useImproveText() {
  return useMutation<AiImproveText, Error, { text: string; field: string }>({
    mutationFn: (body) => postJson(`${API_BASE}/improve-text/`, body, AiImproveTextSchema),
  });
}

export function useSuggestTags() {
  return useMutation<AiSuggestTags, Error, { title: string; description: string }>({
    mutationFn: (body) => postJson(`${API_BASE}/suggest-tags/`, body, AiSuggestTagsSchema),
  });
}

export function useRefurbish() {
  return useMutation<AiRefurbish, Error, { raw_text: string }>({
    mutationFn: (body) => postJson(`${API_BASE}/refurbish/`, body, AiRefurbishSchema),
  });
}
