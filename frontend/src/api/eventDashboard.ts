/**
 * TanStack Query hooks for Event Dashboard features:
 * Timeline, Payments, Custom Fields, Labels.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  TimelineEntrySchema,
  PaymentSchema,
  CustomFieldSchema,
  LabelSchema,
  ChoiceSchema,
  ExportColumnSchema,
  StatsSchema,
  MailResultSchema,
  ChecklistSchema,
  WaitlistEntrySchema,
  PaginatedWaitlistEntrySchema,
  AttendanceRecordSchema,
  PaginatedAttendanceRecordSchema,
  RoomAssignmentSchema,
  ParentAccessTokenSchema,
  PaginatedParentAccessTokenSchema,
  BudgetItemSchema,
  BudgetSummarySchema,
  ImportPreviewSchema,
  ImportResultSchema,
  type TimelineEntry,
  type Payment,
  type CustomField,
  type Label,
  type Choice,
  type ExportColumn,
  type ExportConfig,
  type Stats,
  type MailCreate,
  type MailResult,
  type Checklist,
  type WaitlistEntry,
  type WaitlistEntryCreate,
  type AttendanceRecord,
  type RoomAssignment,
  type RoomAssignmentCreate,
  type ParentAccessToken,
  type BudgetItem,
  type BudgetItemCreate,
  type BudgetSummary,
  type ImportPreview,
  type ImportResult,
} from '@/schemas/event';

const EVENTS_BASE = '/api/events';

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

// Query key factories
const dashboardKeys = {
  timeline: (slug: string) => ['events', slug, 'timeline'] as const,
  payments: (slug: string) => ['events', slug, 'payments'] as const,
  customFields: (slug: string) => ['events', slug, 'custom-fields'] as const,
  labels: (slug: string) => ['events', slug, 'labels'] as const,
  participants: (slug: string) => ['events', slug, 'participants'] as const,
  exportColumns: (slug: string) => ['events', slug, 'export-columns'] as const,
  stats: (slug: string) => ['events', slug, 'stats'] as const,
  checklist: (slug: string) => ['events', slug, 'checklist'] as const,
  waitlist: (slug: string) => ['events', slug, 'waitlist'] as const,
  attendance: (slug: string) => ['events', slug, 'attendance'] as const,
  rooms: (slug: string) => ['events', slug, 'rooms'] as const,
  parentTokens: (slug: string) => ['events', slug, 'parent-access'] as const,
  budget: (slug: string) => ['events', slug, 'budget'] as const,
};

// ==========================================================================
// Timeline
// ==========================================================================

export function useEventTimeline(
  slug: string,
  filters?: { participant_id?: number; action_type?: string; page?: number },
) {
  const params = new URLSearchParams();
  if (filters?.participant_id) params.set('participant_id', String(filters.participant_id));
  if (filters?.action_type) params.set('action_type', filters.action_type);
  if (filters?.page) params.set('page', String(filters.page));
  const qs = params.toString() ? `?${params.toString()}` : '';

  return useQuery<TimelineEntry[]>({
    queryKey: [...dashboardKeys.timeline(slug), filters],
    queryFn: () =>
      fetchJson(`${EVENTS_BASE}/${slug}/timeline/${qs}`, z.array(TimelineEntrySchema)),
    enabled: !!slug,
  });
}

// ==========================================================================
// Payments
// ==========================================================================

export function useEventPayments(slug: string, participantId?: number) {
  const qs = participantId ? `?participant_id=${participantId}` : '';
  return useQuery<Payment[]>({
    queryKey: [...dashboardKeys.payments(slug), participantId],
    queryFn: () =>
      fetchJson(`${EVENTS_BASE}/${slug}/payments/${qs}`, z.array(PaymentSchema)),
    enabled: !!slug,
  });
}

export function useCreatePayment(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      participant_id: number;
      amount: string;
      method: string;
      received_at: string;
      location?: string;
      note?: string;
    }) => postJson(`${EVENTS_BASE}/${slug}/payments/`, body, PaymentSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.payments(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.participants(slug) });
      queryClient.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

export function useDeletePayment(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: number) =>
      deleteJson(`${EVENTS_BASE}/${slug}/payments/${paymentId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.payments(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.participants(slug) });
      queryClient.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

export function usePaymentMethodChoices() {
  return useQuery<Choice[]>({
    queryKey: ['choices', 'payment-methods'],
    queryFn: () =>
      fetchJson(`${EVENTS_BASE}/choices/payment-methods/`, z.array(ChoiceSchema)),
    staleTime: 60 * 60 * 1000,
  });
}

// ==========================================================================
// Custom Fields
// ==========================================================================

export function useCustomFields(slug: string) {
  return useQuery<CustomField[]>({
    queryKey: dashboardKeys.customFields(slug),
    queryFn: () =>
      fetchJson(`${EVENTS_BASE}/${slug}/custom-fields/`, z.array(CustomFieldSchema)),
    enabled: !!slug,
  });
}

export function useCreateCustomField(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      label: string;
      field_type: string;
      options?: string[] | null;
      is_required?: boolean;
      sort_order?: number;
    }) => postJson(`${EVENTS_BASE}/${slug}/custom-fields/`, body, CustomFieldSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.customFields(slug) });
    },
  });
}

export function useUpdateCustomField(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, ...body }: {
      fieldId: number;
      label?: string;
      field_type?: string;
      options?: string[] | null;
      is_required?: boolean;
      sort_order?: number;
    }) => patchJson(`${EVENTS_BASE}/${slug}/custom-fields/${fieldId}/`, body, CustomFieldSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.customFields(slug) });
    },
  });
}

export function useDeleteCustomField(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: number) =>
      deleteJson(`${EVENTS_BASE}/${slug}/custom-fields/${fieldId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.customFields(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.participants(slug) });
    },
  });
}

// ==========================================================================
// Labels
// ==========================================================================

export function useLabels(slug: string) {
  return useQuery<Label[]>({
    queryKey: dashboardKeys.labels(slug),
    queryFn: () =>
      fetchJson(`${EVENTS_BASE}/${slug}/labels/`, z.array(LabelSchema)),
    enabled: !!slug,
  });
}

export function useCreateLabel(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color?: string }) =>
      postJson(`${EVENTS_BASE}/${slug}/labels/`, body, LabelSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.labels(slug) });
    },
  });
}

export function useUpdateLabel(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ labelId, ...body }: { labelId: number; name?: string; color?: string }) =>
      patchJson(`${EVENTS_BASE}/${slug}/labels/${labelId}/`, body, LabelSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.labels(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.participants(slug) });
    },
  });
}

export function useDeleteLabel(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labelId: number) =>
      deleteJson(`${EVENTS_BASE}/${slug}/labels/${labelId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.labels(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.participants(slug) });
    },
  });
}

export function useAssignLabel(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, labelId }: { participantId: number; labelId: number }) => {
      return postJson(
        `${EVENTS_BASE}/${slug}/participants/${participantId}/labels/`,
        { label_id: labelId },
        z.object({ success: z.boolean(), message: z.string() }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.participants(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
    },
  });
}

export function useRemoveLabel(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, labelId }: { participantId: number; labelId: number }) =>
      deleteJson(`${EVENTS_BASE}/${slug}/participants/${participantId}/labels/${labelId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.participants(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
    },
  });
}

// ==========================================================================
// Export
// ==========================================================================

export function useExportColumns(slug: string) {
  return useQuery<ExportColumn[]>({
    queryKey: dashboardKeys.exportColumns(slug),
    queryFn: () =>
      fetchJson(`${EVENTS_BASE}/${slug}/export/columns/`, z.array(ExportColumnSchema)),
    enabled: !!slug,
  });
}

export function useExportParticipants(slug: string) {
  return useMutation({
    mutationFn: async (config: ExportConfig) => {
      const res = await fetch(`${EVENTS_BASE}/${slug}/export/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `API error: ${res.status}`);
      }
      // File download — extract filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `export.${config.format === 'excel' ? 'xlsx' : config.format}`;
      const blob = await res.blob();
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

// ==========================================================================
// Statistics
// ==========================================================================

export function useEventStats(slug: string) {
  return useQuery<Stats>({
    queryKey: dashboardKeys.stats(slug),
    queryFn: () => fetchJson(`${EVENTS_BASE}/${slug}/stats/`, StatsSchema),
    enabled: !!slug,
  });
}

// ==========================================================================
// Mail
// ==========================================================================

export function useSendMail(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<MailResult, Error, MailCreate>({
    mutationFn: (body: MailCreate) =>
      postJson(`${EVENTS_BASE}/${slug}/send-mail/`, body, MailResultSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
    },
  });
}

// ==========================================================================
// Checklist (8.4)
// ==========================================================================

export function useEventChecklist(slug: string) {
  return useQuery<Checklist>({
    queryKey: dashboardKeys.checklist(slug),
    queryFn: () => fetchJson(`${EVENTS_BASE}/${slug}/checklist/`, ChecklistSchema),
    enabled: !!slug,
  });
}

// ==========================================================================
// Waitlist (8.5)
// ==========================================================================

export function useWaitlist(slug: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...dashboardKeys.waitlist(slug), page, pageSize],
    queryFn: () =>
      fetchJson(
        `${EVENTS_BASE}/${slug}/waitlist/?page=${page}&page_size=${pageSize}`,
        PaginatedWaitlistEntrySchema,
      ),
    enabled: !!slug,
  });
}

export function useJoinWaitlist(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<WaitlistEntry, Error, WaitlistEntryCreate>({
    mutationFn: (body) =>
      postJson(`${EVENTS_BASE}/${slug}/waitlist/`, body, WaitlistEntrySchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.waitlist(slug) });
      queryClient.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

export function useRemoveFromWaitlist(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (entryId) =>
      deleteJson(`${EVENTS_BASE}/${slug}/waitlist/${entryId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.waitlist(slug) });
    },
  });
}

// ==========================================================================
// Attendance (8.6)
// ==========================================================================

export function useAttendanceList(slug: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: [...dashboardKeys.attendance(slug), page, pageSize],
    queryFn: () =>
      fetchJson(
        `${EVENTS_BASE}/${slug}/attendance/?page=${page}&page_size=${pageSize}`,
        PaginatedAttendanceRecordSchema,
      ),
    enabled: !!slug,
  });
}

export function useCheckIn(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<AttendanceRecord, Error, { participant_id: number }>({
    mutationFn: (body) =>
      postJson(`${EVENTS_BASE}/${slug}/attendance/check-in/`, body, AttendanceRecordSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.attendance(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
    },
  });
}

export function useBatchCheckIn(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<AttendanceRecord[], Error, { participant_ids: number[] }>({
    mutationFn: (body) =>
      postJson(
        `${EVENTS_BASE}/${slug}/attendance/batch-check-in/`,
        body,
        z.array(AttendanceRecordSchema),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.attendance(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
    },
  });
}

export function useCheckOut(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<AttendanceRecord, Error, number>({
    mutationFn: (participantId) =>
      patchJson(
        `${EVENTS_BASE}/${slug}/attendance/${participantId}/check-out/`,
        {},
        AttendanceRecordSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.attendance(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
    },
  });
}

// ==========================================================================
// Room Assignment (8.7)
// ==========================================================================

export function useRooms(slug: string) {
  return useQuery<RoomAssignment[]>({
    queryKey: dashboardKeys.rooms(slug),
    queryFn: () =>
      fetchJson(`${EVENTS_BASE}/${slug}/rooms/`, z.array(RoomAssignmentSchema)),
    enabled: !!slug,
  });
}

export function useCreateRoom(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<RoomAssignment, Error, RoomAssignmentCreate>({
    mutationFn: (body) =>
      postJson(`${EVENTS_BASE}/${slug}/rooms/`, body, RoomAssignmentSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.rooms(slug) });
    },
  });
}

export function useUpdateRoom(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<RoomAssignment, Error, { roomId: number; name?: string; capacity?: number; description?: string; sort_order?: number }>({
    mutationFn: ({ roomId, ...body }) =>
      patchJson(`${EVENTS_BASE}/${slug}/rooms/${roomId}/`, body, RoomAssignmentSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.rooms(slug) });
    },
  });
}

export function useDeleteRoom(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (roomId) =>
      deleteJson(`${EVENTS_BASE}/${slug}/rooms/${roomId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.rooms(slug) });
    },
  });
}

export function useAssignParticipant(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<RoomAssignment, Error, { roomId: number; participant_id: number }>({
    mutationFn: ({ roomId, ...body }) =>
      patchJson(`${EVENTS_BASE}/${slug}/rooms/${roomId}/assign/`, body, RoomAssignmentSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.rooms(slug) });
    },
  });
}

export function useUnassignParticipant(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<RoomAssignment, Error, { roomId: number; participant_id: number }>({
    mutationFn: ({ roomId, ...body }) =>
      patchJson(`${EVENTS_BASE}/${slug}/rooms/${roomId}/unassign/`, body, RoomAssignmentSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.rooms(slug) });
    },
  });
}

// ==========================================================================
// Parent Access (8.8)
// ==========================================================================

export function useParentTokens(slug: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...dashboardKeys.parentTokens(slug), page, pageSize],
    queryFn: () =>
      fetchJson(
        `${EVENTS_BASE}/${slug}/parent-access/?page=${page}&page_size=${pageSize}`,
        PaginatedParentAccessTokenSchema,
      ),
    enabled: !!slug,
  });
}

export function useCreateParentToken(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<ParentAccessToken, Error, { participant_id: number; email?: string; expires_in_days?: number }>({
    mutationFn: (body) =>
      postJson(`${EVENTS_BASE}/${slug}/parent-access/`, body, ParentAccessTokenSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.parentTokens(slug) });
    },
  });
}

export function useBatchCreateParentTokens(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<ParentAccessToken[], Error, { email_field?: string; expires_in_days?: number }>({
    mutationFn: (body) =>
      postJson(
        `${EVENTS_BASE}/${slug}/parent-access/batch/`,
        body,
        z.array(ParentAccessTokenSchema),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.parentTokens(slug) });
    },
  });
}

export function useRevokeParentToken(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (tokenId) =>
      deleteJson(`${EVENTS_BASE}/${slug}/parent-access/${tokenId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.parentTokens(slug) });
    },
  });
}

// ==========================================================================
// Budget (8.9)
// ==========================================================================

export function useBudgetSummary(slug: string) {
  return useQuery<BudgetSummary>({
    queryKey: dashboardKeys.budget(slug),
    queryFn: () => fetchJson(`${EVENTS_BASE}/${slug}/budget/`, BudgetSummarySchema),
    enabled: !!slug,
  });
}

export function useCreateBudgetItem(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<BudgetItem, Error, BudgetItemCreate>({
    mutationFn: (body) =>
      postJson(`${EVENTS_BASE}/${slug}/budget/items/`, body, BudgetItemSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.budget(slug) });
    },
  });
}

export function useUpdateBudgetItem(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<BudgetItem, Error, { itemId: number; description?: string; amount?: string; category?: string; is_expense?: boolean }>({
    mutationFn: ({ itemId, ...body }) =>
      patchJson(`${EVENTS_BASE}/${slug}/budget/items/${itemId}/`, body, BudgetItemSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.budget(slug) });
    },
  });
}

export function useDeleteBudgetItem(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (itemId) =>
      deleteJson(`${EVENTS_BASE}/${slug}/budget/items/${itemId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.budget(slug) });
    },
  });
}

// ==========================================================================
// Import (8.10)
// ==========================================================================

export function useImportPreview(slug: string) {
  return useMutation<ImportPreview, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${EVENTS_BASE}/${slug}/import/preview/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `API error: ${res.status}`);
      }
      return ImportPreviewSchema.parse(await res.json());
    },
  });
}

export function useImportParticipants(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${EVENTS_BASE}/${slug}/import/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `API error: ${res.status}`);
      }
      return ImportResultSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.participants(slug) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.timeline(slug) });
      queryClient.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}
