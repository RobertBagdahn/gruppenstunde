/**
 * TanStack Query hooks for the Event API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  EventListSchema,
  EventDetailSchema,
  PersonSchema,
  RegistrationSchema,
  ParticipantSchema,
  BookingOptionSchema,
  ChoiceSchema,
  EventLocationSchema,
  GenerateInvitationSchema,
  PaginatedEventListSchema,
  PaginatedPersonSchema,
  PaginatedLocationSchema,
  PaginatedInvitationStatusSchema,
  type Person,
  type Choice,
  type EventLocation,
} from '@/schemas/event';


const EVENTS_BASE = '/api/events';
const PERSONS_BASE = '/api/persons';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  const data = await res.json();
  return schema.parse(data);
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
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `API error: ${res.status}`);
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
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `API error: ${res.status}`);
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
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `API error: ${res.status}`);
  }
}

// ==========================================================================
// Choices
// ==========================================================================

export function useGenderChoices() {
  return useQuery<Choice[]>({
    queryKey: ['choices', 'gender'],
    queryFn: () => fetchJson(`${EVENTS_BASE}/choices/gender/`, z.array(ChoiceSchema)),
    staleTime: 60 * 60 * 1000,
  });
}

// ==========================================================================
// Persons
// ==========================================================================

export function usePersons() {
  return useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: async () => {
      const result = await fetchJson(`${PERSONS_BASE}/`, PaginatedPersonSchema);
      return result.items;
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      first_name: string;
      last_name: string;
      scout_name?: string;
      email?: string;
      birthday?: string | null;
      gender?: string;
      nutritional_tag_ids?: number[];
      address?: string;
      zip_code?: string;
      is_owner?: boolean;
    }) => postJson(`${PERSONS_BASE}/`, body, PersonSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
    },
  });
}

export function useUpdatePerson(personId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<{
      first_name: string;
      last_name: string;
      scout_name: string;
      email: string;
      birthday: string | null;
      gender: string;
      nutritional_tag_ids: number[];
      address: string;
      zip_code: string;
    }>) => patchJson(`${PERSONS_BASE}/${personId}/`, body, PersonSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personId: number) => deleteJson(`${PERSONS_BASE}/${personId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
    },
  });
}

// ==========================================================================
// Events
// ==========================================================================

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const result = await fetchJson(`${EVENTS_BASE}/`, PaginatedEventListSchema);
      return result.items;
    },
  });
}

export function useMyInvitedEvents() {
  return useQuery({
    queryKey: ['events', 'my-invited'],
    queryFn: () => fetchJson(`${EVENTS_BASE}/my-invited/`, z.array(EventListSchema)),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyRegisteredEvents() {
  return useQuery({
    queryKey: ['events', 'my-registered'],
    queryFn: () => fetchJson(`${EVENTS_BASE}/my-registered/`, z.array(EventListSchema)),
    staleTime: 2 * 60 * 1000,
  });
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ['event', slug],
    queryFn: () => fetchJson(`${EVENTS_BASE}/${encodeURIComponent(slug)}/`, EventDetailSchema),
    enabled: slug.length > 0,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      location?: string;
      event_location_id?: number | null;
      invitation_text?: string;
      start_date?: string | null;
      end_date?: string | null;
      registration_deadline?: string | null;
      is_public?: boolean;
      packing_list_id?: number | null;
      booking_options?: { name: string; description?: string; price?: string; max_participants?: number }[];
    }) => postJson(`${EVENTS_BASE}/`, body, EventListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<{
      name: string;
      description: string;
      location: string;
      event_location_id: number | null;
      invitation_text: string;
      start_date: string | null;
      end_date: string | null;
      registration_deadline: string | null;
      registration_start: string | null;
      is_public: boolean;
      packing_list_id: number | null;
      participant_visibility: string;
    }>) => patchJson(`${EVENTS_BASE}/${encodeURIComponent(slug)}/`, body, EventListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', slug] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => deleteJson(`${EVENTS_BASE}/${encodeURIComponent(slug)}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// ==========================================================================
// Booking Options
// ==========================================================================

export function useCreateBookingOption(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      price?: string;
      max_participants?: number;
    }) => postJson(`${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/booking-options/`, body, BookingOptionSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateBookingOption(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, ...body }: {
      optionId: number;
      name?: string;
      description?: string;
      price?: string;
      max_participants?: number;
    }) => patchJson(`${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/booking-options/${optionId}/`, body, BookingOptionSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteBookingOption(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optionId: number) =>
      deleteJson(`${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/booking-options/${optionId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// ==========================================================================
// Registration
// ==========================================================================

export function useRegisterForEvent(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      persons: { person_id: number; booking_option_id?: number | null }[];
    }) => postJson(`${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/register/`, body, RegistrationSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useRemoveParticipant(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: number) =>
      deleteJson(`${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/participants/${participantId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateParticipant(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, ...body }: { participantId: number; is_paid?: boolean; booking_option_id?: number | null }) =>
      patchJson(
        `${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/participants/${participantId}/`,
        body,
        ParticipantSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventSlug] });
    },
  });
}

// ==========================================================================
// Invitations
// ==========================================================================

const SuccessSchema = z.object({ success: z.boolean(), message: z.string() });

export function useInviteGroup(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { group_slug: string }) =>
      postJson(`${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/invite-group/`, body, SuccessSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventSlug] });
    },
  });
}

export function useInviteUsers(eventSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: number[]) =>
      postJson(`${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/invite-users/`, userIds, SuccessSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventSlug] });
    },
  });
}

// ==========================================================================
// Locations
// ==========================================================================

const LOCATIONS_BASE = '/api/locations';

export function useLocations() {
  return useQuery<EventLocation[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const result = await fetchJson(`${LOCATIONS_BASE}/`, PaginatedLocationSchema);
      return result.items;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      street?: string;
      zip_code?: string;
      city?: string;
      state?: string;
      country?: string;
      description?: string;
    }) => postJson(`${LOCATIONS_BASE}/`, body, EventLocationSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

// ==========================================================================
// AI Invitation Text
// ==========================================================================

export function useGenerateInvitation() {
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      start_date?: string | null;
      end_date?: string | null;
      location_name?: string;
      location_address?: string;
      booking_options?: string[];
      special_notes?: string;
    }) => postJson(`${EVENTS_BASE}/generate-invitation/`, body, GenerateInvitationSchema),
  });
}

// ==========================================================================
// Event Invitations (invited users with status)
// ==========================================================================

export function useEventInvitations(
  eventSlug: string,
  params?: { page?: number; pageSize?: number; status?: string; search?: string },
) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const status = params?.status ?? '';
  const search = params?.search ?? '';

  return useQuery({
    queryKey: ['event', eventSlug, 'invitations', { page, pageSize, status, search }],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(page));
      searchParams.set('page_size', String(pageSize));
      if (status) searchParams.set('status', status);
      if (search) searchParams.set('search', search);
      return fetchJson(
        `${EVENTS_BASE}/${encodeURIComponent(eventSlug)}/invitations/?${searchParams.toString()}`,
        PaginatedInvitationStatusSchema,
      );
    },
    enabled: eventSlug.length > 0,
  });
}

// ==========================================================================
// Participant Visibility Choices
// ==========================================================================

export function useParticipantVisibilityChoices() {
  return useQuery<Choice[]>({
    queryKey: ['choices', 'participant-visibility'],
    queryFn: () => fetchJson(`${EVENTS_BASE}/choices/participant-visibility/`, z.array(ChoiceSchema)),
    staleTime: 60 * 60 * 1000,
  });
}
