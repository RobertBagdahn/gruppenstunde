/**
 * TanStack Query hooks for Event Day Plan (Day Slots) API.
 * Endpoints: /api/events/{slug}/day-slots/
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { EventDaySlotSchema, type EventDaySlot } from '@/schemas/event';

const BASE = '/api/events';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchDaySlots(slug: string): Promise<EventDaySlot[]> {
  const res = await fetch(`${BASE}/${slug}/day-slots/`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  const data = await res.json();
  return z.array(EventDaySlotSchema).parse(data);
}

interface CreateDaySlotPayload {
  date: string;
  title: string;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string;
  content_type?: string | null;
  object_id?: number | null;
  sort_order?: number;
}

async function createDaySlot(
  slug: string,
  payload: CreateDaySlotPayload,
): Promise<EventDaySlot> {
  const res = await fetch(`${BASE}/${slug}/day-slots/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return EventDaySlotSchema.parse(await res.json());
}

interface UpdateDaySlotPayload {
  date?: string;
  title?: string;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string;
  content_type?: string | null;
  object_id?: number | null;
  sort_order?: number;
}

async function updateDaySlot(
  slug: string,
  slotId: number,
  payload: UpdateDaySlotPayload,
): Promise<EventDaySlot> {
  const res = await fetch(`${BASE}/${slug}/day-slots/${slotId}/`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return EventDaySlotSchema.parse(await res.json());
}

async function deleteDaySlot(slug: string, slotId: number): Promise<void> {
  const res = await fetch(`${BASE}/${slug}/day-slots/${slotId}/`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-CSRFToken': getCsrfToken() },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const daySlotKeys = {
  all: (slug: string) => ['events', slug, 'day-slots'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useEventDaySlots(slug: string | undefined) {
  return useQuery({
    queryKey: daySlotKeys.all(slug ?? ''),
    queryFn: () => fetchDaySlots(slug!),
    enabled: !!slug,
  });
}

export function useCreateDaySlot(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDaySlotPayload) => createDaySlot(slug, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: daySlotKeys.all(slug) });
      // Also invalidate event detail to refresh day_slots in EventDetailSchema
      qc.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

export function useUpdateDaySlot(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slotId,
      ...payload
    }: UpdateDaySlotPayload & { slotId: number }) =>
      updateDaySlot(slug, slotId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: daySlotKeys.all(slug) });
      qc.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

export function useDeleteDaySlot(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: number) => deleteDaySlot(slug, slotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: daySlotKeys.all(slug) });
      qc.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}
