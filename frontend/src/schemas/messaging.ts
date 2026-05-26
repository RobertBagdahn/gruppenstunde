/**
 * Zod schemas for unified event messaging (email + WhatsApp).
 * MUST stay in sync with backend/event/schemas/messaging.py
 */
import { z } from 'zod';

// --- Channel + Recipient Type ---

export const MessageChannelSchema = z.enum(['email', 'whatsapp']);
export type MessageChannel = z.infer<typeof MessageChannelSchema>;

export const RecipientTypeSchema = z.enum(['all', 'filtered', 'selected']);
export type RecipientType = z.infer<typeof RecipientTypeSchema>;

// --- Message Filters ---

export const MessageFilterSchema = z.object({
  is_paid: z.boolean().nullable().optional(),
  booking_option_id: z.number().nullable().optional(),
  label_id: z.number().nullable().optional(),
});
export type MessageFilter = z.infer<typeof MessageFilterSchema>;

// --- Send Message Input ---

export const SendMessageSchema = z.object({
  channel: MessageChannelSchema,
  subject: z.string(),
  body: z.string().min(1, 'Nachrichtentext ist erforderlich'),
  recipient_type: RecipientTypeSchema,
  filters: MessageFilterSchema.nullable().optional(),
  participant_ids: z.array(z.number()).nullable().optional(),
  template_id: z.number().nullable().optional(),
});
export type SendMessage = z.infer<typeof SendMessageSchema>;

// --- WhatsApp Availability Status ---

export const WhatsAppStatusSchema = z.enum([
  'available',
  'unavailable',
  'no_phone',
  'no_contact',
  'not_applicable',
  'unknown',
]);
export type WhatsAppStatus = z.infer<typeof WhatsAppStatusSchema>;

// --- Preview ---

export const RecipientPreviewSchema = z.object({
  participant_id: z.number(),
  name: z.string(),
  contact: z.string(),
  whatsapp_status: WhatsAppStatusSchema,
});
export type RecipientPreview = z.infer<typeof RecipientPreviewSchema>;

export const MessagePreviewSchema = z.object({
  recipients: z.array(RecipientPreviewSchema),
  total_count: z.number(),
  reachable_count: z.number(),
  unreachable_count: z.number(),
  channel: MessageChannelSchema,
  sample_message: z.string(),
});
export type MessagePreview = z.infer<typeof MessagePreviewSchema>;

// --- Send Result ---

export const FailedRecipientSchema = z.object({
  participant_id: z.number(),
  phone_number: z.string(),
  email: z.string(),
  error: z.string(),
});
export type FailedRecipient = z.infer<typeof FailedRecipientSchema>;

export const SendMessageResultSchema = z.object({
  sent_count: z.number(),
  failed_count: z.number(),
  failed_recipients: z.array(FailedRecipientSchema),
});
export type SendMessageResult = z.infer<typeof SendMessageResultSchema>;
