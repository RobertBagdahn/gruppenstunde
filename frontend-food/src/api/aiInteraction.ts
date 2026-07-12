import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';
import {
  AiVoteInSchema,
  AiVoteOutSchema,
  AiInteractionStatsSchema,
  UserCostSchema,
  PaginatedAiInteractionsSchema,
  GeminiPricingSchema,
  type AiInteractionStats,
  type UserCost,
  type PaginatedAiInteractions,
  type GeminiPricing,
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

interface StatsFilters {
  dateFrom?: string;
  dateTo?: string;
  includeBackground?: boolean;
}

export function useAiInteractionStats(filters?: StatsFilters) {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters?.dateTo) params.set('date_to', filters.dateTo);
  if (filters?.includeBackground) params.set('include_background', 'true');
  const qs = params.toString();

  return useQuery<AiInteractionStats>({
    queryKey: ['ai-interaction-stats', filters?.dateFrom, filters?.dateTo, filters?.includeBackground],
    queryFn: async () => {
      return fetchJson(
        `${API_BASE}/admin/ai-interactions/stats/${qs ? '?' + qs : ''}`,
        AiInteractionStatsSchema,
      );
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useAiUserCosts(filters?: { dateFrom?: string; dateTo?: string; includeBackground?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters?.dateTo) params.set('date_to', filters.dateTo);
  if (filters?.includeBackground) params.set('include_background', 'true');
  const qs = params.toString();

  return useQuery<UserCost[]>({
    queryKey: ['ai-user-costs', filters?.dateFrom, filters?.dateTo, filters?.includeBackground],
    queryFn: async () => {
      return fetchJson(
        `${API_BASE}/admin/ai-interactions/user-costs/${qs ? '?' + qs : ''}`,
        z.array(UserCostSchema),
      );
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useAiUserInteractions(userId: number, page: number = 1) {
  return useQuery<PaginatedAiInteractions>({
    queryKey: ['ai-user-interactions', userId, page],
    queryFn: async () => {
      return fetchJson(
        `${API_BASE}/admin/ai-interactions/?user_id=${userId}&page=${page}&page_size=20`,
        PaginatedAiInteractionsSchema,
      );
    },
    staleTime: 30_000,
    enabled: userId > 0 && page > 0,
  });
}

export function useAiPricing() {
  return useQuery<GeminiPricing>({
    queryKey: ['ai-pricing'],
    queryFn: async () => {
      return fetchJson(
        `${API_BASE}/admin/ai-pricing/`,
        GeminiPricingSchema,
      );
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}