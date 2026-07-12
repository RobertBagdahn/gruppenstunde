import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';
import {
  AiVoteInSchema,
  AiVoteOutSchema,
  AiInteractionStatsSchema,
  AiInteractionDetailSchema,
  UserCostSchema,
  PaginatedAiInteractionsSchema,
  type AiInteractionStats,
  type AiInteractionDetail,
  type UserCost,
  type PaginatedAiInteractions,
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

export interface AiInteractionFilters {
  page?: number;
  page_size?: number;
  context?: string;
  user_id?: number;
  success?: string;
  is_background?: string;
  has_vote?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export function useAiInteractions(filters: AiInteractionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.context) params.set('context', filters.context);
  if (filters.user_id) params.set('user_id', String(filters.user_id));
  if (filters.success) params.set('success', filters.success);
  if (filters.is_background) params.set('is_background', filters.is_background);
  if (filters.has_vote) params.set('has_vote', filters.has_vote);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.search) params.set('search', filters.search);

  return useQuery<PaginatedAiInteractions>({
    queryKey: ['ai-interactions', filters],
    queryFn: async () => {
      const qs = params.toString();
      return fetchJson(
        `${API_BASE}/admin/ai-interactions/${qs ? `?${qs}` : ''}`,
        PaginatedAiInteractionsSchema,
      );
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useAiInteractionDetail(interactionId: string | null) {
  return useQuery<AiInteractionDetail>({
    queryKey: ['ai-interaction-detail', interactionId],
    queryFn: async () => {
      return fetchJson(
        `${API_BASE}/admin/ai-interactions/${interactionId}/`,
        AiInteractionDetailSchema,
      );
    },
    enabled: !!interactionId,
    staleTime: 60_000,
    retry: false,
  });
}

export function useAiUserCosts() {
  return useQuery<UserCost[]>({
    queryKey: ['ai-user-costs'],
    queryFn: async () => {
      return fetchJson(
        `${API_BASE}/admin/ai-interactions/user-costs/`,
        z.array(UserCostSchema),
      );
    },
    staleTime: 60_000,
    retry: false,
  });
}
