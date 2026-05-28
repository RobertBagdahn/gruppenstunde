/**
 * TanStack Query hooks for WhatsApp connection, unified messaging,
 * and message templates.
 * Endpoints: /api/whatsapp/*, /api/message-templates/*, /api/events/{slug}/messages/*
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  WhatsAppQRResponseSchema,
  WhatsAppConnectionStatusSchema,
  WhatsAppStatsSchema,
  WhatsAppHealthCheckSchema,
  WhatsAppTestResultSchema,
  WhatsAppReconnectSchema,
  WhatsAppConnectionLogSchema,
  MessageTemplateSchema,
  type WhatsAppQRResponse,
  type WhatsAppConnectionStatus,
  type WhatsAppStats,
  type WhatsAppHealthCheck,
  type WhatsAppTestResult,
  type WhatsAppReconnect,
  type WhatsAppConnectionLogEntry,
  type MessageTemplate,
  type MessageTemplateCreate,
  type MessageTemplateUpdate,
} from '@/schemas/whatsapp';
import { API_BASE_URL } from '@/lib/api';
import {
  MessagePreviewSchema,
  SendMessageResultSchema,
  type MessagePreview,
  type SendMessage,
  type SendMessageResult,
} from '@/schemas/messaging';

const WHATSAPP_BASE = `${API_BASE_URL}/api/whatsapp`;
const TEMPLATES_BASE = `${API_BASE_URL}/api/message-templates`;
const EVENTS_BASE = `${API_BASE_URL}/api/events`;

// ---------------------------------------------------------------------------
// Fetch helpers (per-file convention, see frontend/AGENTS.md)
// ---------------------------------------------------------------------------

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

async function putJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
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
const whatsappKeys = {
  status: () => ['whatsapp', 'status'] as const,
  qrStatus: () => ['whatsapp', 'qr-status'] as const,
  stats: () => ['whatsapp', 'stats'] as const,
  logs: () => ['whatsapp', 'logs'] as const,
  templates: () => ['message-templates'] as const,
};

// ==========================================================================
// WhatsApp Connection
// ==========================================================================

/** Start WhatsApp connection flow (generates QR code). */
export function useWhatsAppConnect() {
  const queryClient = useQueryClient();
  return useMutation<WhatsAppQRResponse, Error, { privacy_consent: boolean }>({
    mutationFn: (body) =>
      postJson(`${WHATSAPP_BASE}/connect/`, body, WhatsAppQRResponseSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.status() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.qrStatus() });
    },
  });
}

/** Poll QR pairing status every 2s until connected or failed. */
export function useWhatsAppQRStatus(enabled: boolean) {
  return useQuery<WhatsAppQRResponse>({
    queryKey: whatsappKeys.qrStatus(),
    queryFn: () =>
      fetchJson(`${WHATSAPP_BASE}/qr-status/`, WhatsAppQRResponseSchema),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once connected, failed, or timed out
      if (status === 'connected' || status === 'failed' || status === 'timeout') {
        return false;
      }
      return 2000;
    },
  });
}

/** Disconnect WhatsApp (keep connection record for stats). */
export function useWhatsAppDisconnect() {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetch(`${WHATSAPP_BASE}/disconnect/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `API error: ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.status() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.stats() });
    },
  });
}

/** Get full WhatsApp connection status for profile display. */
export function useWhatsAppStatus() {
  return useQuery<WhatsAppConnectionStatus>({
    queryKey: whatsappKeys.status(),
    queryFn: () =>
      fetchJson(`${WHATSAPP_BASE}/status/`, WhatsAppConnectionStatusSchema),
    staleTime: 30_000, // 30s
  });
}

/** Delete all WhatsApp data (irreversible). */
export function useWhatsAppDelete() {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: () => deleteJson(`${WHATSAPP_BASE}/delete/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.status() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.stats() });
    },
  });
}

/** Get WhatsApp message statistics. */
export function useWhatsAppStats() {
  return useQuery<WhatsAppStats>({
    queryKey: whatsappKeys.stats(),
    queryFn: () =>
      fetchJson(`${WHATSAPP_BASE}/stats/`, WhatsAppStatsSchema),
    staleTime: 60_000, // 1min
  });
}

/** Actively verify WhatsApp connection against neonize session. */
export function useWhatsAppHealthCheck() {
  const queryClient = useQueryClient();
  return useMutation<WhatsAppHealthCheck, Error>({
    mutationFn: () =>
      postJson(`${WHATSAPP_BASE}/health-check/`, {}, WhatsAppHealthCheckSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.status() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.logs() });
    },
  });
}

/** Send a test WhatsApp message to the user's own phone number. */
export function useWhatsAppTest() {
  const queryClient = useQueryClient();
  return useMutation<WhatsAppTestResult, Error>({
    mutationFn: () =>
      postJson(`${WHATSAPP_BASE}/test/`, {}, WhatsAppTestResultSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.stats() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.logs() });
    },
  });
}

/** Attempt to reconnect WhatsApp session without new QR code. */
export function useWhatsAppReconnect() {
  const queryClient = useQueryClient();
  return useMutation<WhatsAppReconnect, Error>({
    mutationFn: () =>
      postJson(`${WHATSAPP_BASE}/reconnect/`, {}, WhatsAppReconnectSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.status() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.logs() });
    },
  });
}

/** Get the last 10 WhatsApp connection events for diagnostics. */
export function useWhatsAppLogs() {
  return useQuery<WhatsAppConnectionLogEntry[]>({
    queryKey: whatsappKeys.logs(),
    queryFn: () =>
      fetchJson(`${WHATSAPP_BASE}/logs/`, z.array(WhatsAppConnectionLogSchema)),
    staleTime: 30_000, // 30s
  });
}

// ==========================================================================
// Unified Messaging (Preview + Send)
// ==========================================================================

/** Preview message recipients before sending. */
export function useMessagePreview(slug: string) {
  return useMutation<MessagePreview, Error, SendMessage>({
    mutationFn: (body) =>
      postJson(`${EVENTS_BASE}/${slug}/messages/preview/`, body, MessagePreviewSchema),
  });
}

/** Send messages via selected channel (email or WhatsApp). */
export function useSendMessage(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<SendMessageResult, Error, SendMessage>({
    mutationFn: (body) =>
      postJson(`${EVENTS_BASE}/${slug}/messages/send/`, body, SendMessageResultSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', slug, 'timeline'] });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.stats() });
    },
  });
}

// ==========================================================================
// Message Templates
// ==========================================================================

/** List all message templates (system + user). */
export function useMessageTemplates() {
  return useQuery<MessageTemplate[]>({
    queryKey: whatsappKeys.templates(),
    queryFn: () =>
      fetchJson(`${TEMPLATES_BASE}/`, z.array(MessageTemplateSchema)),
    staleTime: 2 * 60_000, // 2min
  });
}

/** Create a new user message template. */
export function useCreateMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation<MessageTemplate, Error, MessageTemplateCreate>({
    mutationFn: (body) =>
      postJson(`${TEMPLATES_BASE}/`, body, MessageTemplateSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
    },
  });
}

/** Update an existing message template. */
export function useUpdateMessageTemplate(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation<MessageTemplate, Error, MessageTemplateUpdate>({
    mutationFn: (body) =>
      putJson(`${TEMPLATES_BASE}/${templateId}/`, body, MessageTemplateSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
    },
  });
}

/** Delete a message template. */
export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (templateId) =>
      deleteJson(`${TEMPLATES_BASE}/${templateId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
    },
  });
}
