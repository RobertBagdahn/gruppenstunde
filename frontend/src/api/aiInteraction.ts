import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';
import {
  AiVoteInSchema,
  AiVoteOutSchema,
  AiInteractionStatsSchema,
  type AiInteractionStats,
} from '@/schemas/aiInteraction';

const API_BASE = `${API_BASE_URL}/api/content`;

async function patchJson<S extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: S,
): Promise<z.output<S>> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.detail || `Fehler ${res.status}`);
  }
  return schema.parse(await res.json());
}

async function fetchJson<S extends z.ZodTypeAny>(
  url: string,
  schema: S,
): Promise<z.output<S>> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.detail || `Fehler ${res.status}`);
  }
  return schema.parse(await res.json());
}

export function useVoteAiInteraction() {
  return useMutation({
    mutationFn: async ({
      interactionId,
      vote,
    }: {
      interactionId: string;
      vote: 'up' | 'down';
    }) => {
      const parsed = AiVoteInSchema.parse({ vote });
      return patchJson(
        `${API_BASE}/ai-interactions/${interactionId}/vote/`,
        parsed,
        AiVoteOutSchema,
      );
    },
  });
}

export function useAiInteractionStats() {
  return useQuery<AiInteractionStats>({
    queryKey: ['ai-interaction-stats'],
    queryFn: async () => {
      return fetchJson(
        `${API_BASE}/admin/ai-interactions/stats/`,
        AiInteractionStatsSchema,
      );
    },
    staleTime: 60_000,
    retry: false,
  });
}
