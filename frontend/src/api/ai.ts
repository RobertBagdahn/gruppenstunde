/**
 * TanStack Query mutations for the AI API.
 */
import { useMutation } from '@tanstack/react-query';
import {
  AiImproveTextSchema,
  AiSuggestTagsSchema,
  AiRefurbishSchema,
  AiErrorSchema,
  type AiImproveText,
  type AiSuggestTags,
  type AiRefurbish,
} from '@/schemas/content';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';

const API_BASE = `${API_BASE_URL}/api/content/ai`;

/** Extended error class that carries the machine-readable error_code from the backend. */
export class AiApiError extends Error {
  error_code: string;
  status: number;
  ai_interaction_id: string | null;

  constructor(message: string, error_code: string, status: number, ai_interaction_id: string | null = null) {
    super(message);
    this.name = 'AiApiError';
    this.error_code = error_code;
    this.status = status;
    this.ai_interaction_id = ai_interaction_id;
  }
}

async function postJson<S extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: S,
  signal?: AbortSignal,
): Promise<z.output<S>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    // Try to parse structured AI error
    const parsed = AiErrorSchema.safeParse(errBody);
    if (parsed.success) {
      throw new AiApiError(parsed.data.detail, parsed.data.error_code, res.status, parsed.data.ai_interaction_id);
    }
    const detail = errBody?.detail ?? `${res.status} ${res.statusText}`;
    throw new AiApiError(detail, 'UNKNOWN', res.status);
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
  return useMutation<AiRefurbish, AiApiError, { raw_text: string; signal?: AbortSignal }>({
    mutationFn: async ({ raw_text, signal }) => {
      return postJson(`${API_BASE}/refurbish/`, { raw_text }, AiRefurbishSchema, signal);
    },
  });
}

const AiGenerateImageSchema = z.object({
  image_urls: z.array(z.string()),
  ai_interaction_id: z.string().uuid().nullable().optional(),
});
type AiGenerateImage = z.infer<typeof AiGenerateImageSchema>;

export function useGenerateImage() {
  return useMutation<AiGenerateImage, AiApiError, { prompt: string; title?: string; summary?: string; description?: string; content_type?: string; signal?: AbortSignal }>({
    mutationFn: ({ signal, ...body }) => postJson(`${API_BASE}/generate-image/`, body, AiGenerateImageSchema, signal),
  });
}
