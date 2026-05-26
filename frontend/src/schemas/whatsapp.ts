/**
 * Zod schemas for WhatsApp connection and message templates.
 * MUST stay in sync with backend/event/schemas/whatsapp.py
 */
import { z } from 'zod';

// --- WhatsApp Connection ---

export const WhatsAppConnectSchema = z.object({
  privacy_consent: z.boolean(),
});
export type WhatsAppConnect = z.infer<typeof WhatsAppConnectSchema>;

export const WhatsAppQRResponseSchema = z.object({
  status: z.enum(['initializing', 'pending_qr', 'connected', 'failed', 'timeout']),
  qr_code_base64: z.string().nullable().optional(),
  phone_number: z.string().nullable().optional(),
});
export type WhatsAppQRResponse = z.infer<typeof WhatsAppQRResponseSchema>;

export const WhatsAppConnectionStatusSchema = z.object({
  is_connected: z.boolean(),
  phone_number: z.string().nullable().optional(),
  connected_since: z.string().nullable().optional(),
  total_messages_sent: z.number(),
});
export type WhatsAppConnectionStatus = z.infer<typeof WhatsAppConnectionStatusSchema>;

export const WhatsAppStatsSchema = z.object({
  total_sent: z.number(),
  sent_today: z.number(),
  sent_this_week: z.number(),
  last_sent_at: z.string().nullable().optional(),
});
export type WhatsAppStats = z.infer<typeof WhatsAppStatsSchema>;

// --- Health Check, Test, Reconnect, Connection Log ---

export const WhatsAppHealthCheckSchema = z.object({
  is_healthy: z.boolean(),
  status: z.enum(['connected', 'disconnected', 'session_invalid', 'error']),
  checked_at: z.string(),
  message: z.string(),
});
export type WhatsAppHealthCheck = z.infer<typeof WhatsAppHealthCheckSchema>;

export const WhatsAppTestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type WhatsAppTestResult = z.infer<typeof WhatsAppTestResultSchema>;

export const WhatsAppReconnectSchema = z.object({
  success: z.boolean(),
  needs_qr: z.boolean(),
  status: z.enum(['connected', 'pending_qr', 'failed']),
  message: z.string(),
});
export type WhatsAppReconnect = z.infer<typeof WhatsAppReconnectSchema>;

export const WhatsAppConnectionLogSchema = z.object({
  event_type: z.string(),
  message: z.string(),
  created_at: z.string(),
});
export type WhatsAppConnectionLogEntry = z.infer<typeof WhatsAppConnectionLogSchema>;

// --- Message Templates ---

export const MessageTemplateSchema = z.object({
  id: z.number(),
  title: z.string(),
  subject: z.string(),
  body: z.string(),
  is_system: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;

export const MessageTemplateCreateSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  subject: z.string().optional().default(''),
  body: z.string().min(1, 'Nachrichtentext ist erforderlich'),
});
export type MessageTemplateCreate = z.infer<typeof MessageTemplateCreateSchema>;

export const MessageTemplateUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  subject: z.string().optional(),
  body: z.string().min(1).optional(),
});
export type MessageTemplateUpdate = z.infer<typeof MessageTemplateUpdateSchema>;
