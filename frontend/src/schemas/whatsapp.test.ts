/**
 * Tests for WhatsApp Zod schemas.
 */
import { describe, it, expect } from 'vitest';
import {
  WhatsAppConnectSchema,
  WhatsAppQRResponseSchema,
  WhatsAppConnectionStatusSchema,
  WhatsAppStatsSchema,
  MessageTemplateSchema,
  MessageTemplateCreateSchema,
  MessageTemplateUpdateSchema,
} from '@/schemas/whatsapp';

// --- WhatsAppConnectSchema ---

describe('WhatsAppConnectSchema', () => {
  it('parses valid data', () => {
    const result = WhatsAppConnectSchema.safeParse({ privacy_consent: true });
    expect(result.success).toBe(true);
  });

  it('parses false consent', () => {
    const result = WhatsAppConnectSchema.safeParse({ privacy_consent: false });
    expect(result.success).toBe(true);
  });

  it('rejects missing privacy_consent', () => {
    const result = WhatsAppConnectSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean privacy_consent', () => {
    const result = WhatsAppConnectSchema.safeParse({ privacy_consent: 'yes' });
    expect(result.success).toBe(false);
  });
});

// --- WhatsAppQRResponseSchema ---

describe('WhatsAppQRResponseSchema', () => {
  it('parses valid data with all fields', () => {
    const result = WhatsAppQRResponseSchema.safeParse({
      status: 'pending_qr',
      qr_code_base64: 'data:image/png;base64,abc123',
      phone_number: '+491234567890',
    });
    expect(result.success).toBe(true);
  });

  it('parses with only required status field', () => {
    const result = WhatsAppQRResponseSchema.safeParse({ status: 'connected' });
    expect(result.success).toBe(true);
  });

  it('accepts all valid status values', () => {
    for (const status of ['initializing', 'pending_qr', 'connected', 'failed', 'timeout']) {
      const result = WhatsAppQRResponseSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status value', () => {
    const result = WhatsAppQRResponseSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing status', () => {
    const result = WhatsAppQRResponseSchema.safeParse({ qr_code_base64: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts null for optional nullable fields', () => {
    const result = WhatsAppQRResponseSchema.safeParse({
      status: 'failed',
      qr_code_base64: null,
      phone_number: null,
    });
    expect(result.success).toBe(true);
  });
});

// --- WhatsAppConnectionStatusSchema ---

describe('WhatsAppConnectionStatusSchema', () => {
  it('parses valid fully-populated data', () => {
    const result = WhatsAppConnectionStatusSchema.safeParse({
      is_connected: true,
      phone_number: '+491234567890',
      connected_since: '2025-01-15T10:30:00Z',
      total_messages_sent: 42,
    });
    expect(result.success).toBe(true);
  });

  it('parses with only required fields', () => {
    const result = WhatsAppConnectionStatusSchema.safeParse({
      is_connected: false,
      total_messages_sent: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing is_connected', () => {
    const result = WhatsAppConnectionStatusSchema.safeParse({
      total_messages_sent: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing total_messages_sent', () => {
    const result = WhatsAppConnectionStatusSchema.safeParse({
      is_connected: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-number total_messages_sent', () => {
    const result = WhatsAppConnectionStatusSchema.safeParse({
      is_connected: true,
      total_messages_sent: 'many',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null for optional nullable fields', () => {
    const result = WhatsAppConnectionStatusSchema.safeParse({
      is_connected: false,
      phone_number: null,
      connected_since: null,
      total_messages_sent: 0,
    });
    expect(result.success).toBe(true);
  });
});

// --- WhatsAppStatsSchema ---

describe('WhatsAppStatsSchema', () => {
  it('parses valid data', () => {
    const result = WhatsAppStatsSchema.safeParse({
      total_sent: 100,
      sent_today: 5,
      sent_this_week: 20,
      last_sent_at: '2025-04-10T14:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('parses without optional last_sent_at', () => {
    const result = WhatsAppStatsSchema.safeParse({
      total_sent: 0,
      sent_today: 0,
      sent_this_week: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for last_sent_at', () => {
    const result = WhatsAppStatsSchema.safeParse({
      total_sent: 10,
      sent_today: 1,
      sent_this_week: 3,
      last_sent_at: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required number fields', () => {
    const result = WhatsAppStatsSchema.safeParse({ total_sent: 10 });
    expect(result.success).toBe(false);
  });

  it('rejects non-number values', () => {
    const result = WhatsAppStatsSchema.safeParse({
      total_sent: 'ten',
      sent_today: 0,
      sent_this_week: 0,
    });
    expect(result.success).toBe(false);
  });
});

// --- MessageTemplateSchema ---

describe('MessageTemplateSchema', () => {
  const validTemplate = {
    id: 1,
    title: 'Einladung',
    subject: 'Einladung zum Lager',
    body: 'Hallo, ihr seid eingeladen!',
    is_system: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-04-01T12:00:00Z',
  };

  it('parses valid data', () => {
    const result = MessageTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const { id, ...rest } = validTemplate;
    const result = MessageTemplateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const { title, ...rest } = validTemplate;
    const result = MessageTemplateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing body', () => {
    const { body, ...rest } = validTemplate;
    const result = MessageTemplateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean is_system', () => {
    const result = MessageTemplateSchema.safeParse({
      ...validTemplate,
      is_system: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing timestamps', () => {
    const { created_at, updated_at, ...rest } = validTemplate;
    const result = MessageTemplateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// --- MessageTemplateCreateSchema ---

describe('MessageTemplateCreateSchema', () => {
  it('parses valid data', () => {
    const result = MessageTemplateCreateSchema.safeParse({
      title: 'Neue Vorlage',
      body: 'Nachrichtentext hier',
    });
    expect(result.success).toBe(true);
  });

  it('applies default empty string for subject', () => {
    const result = MessageTemplateCreateSchema.safeParse({
      title: 'Vorlage',
      body: 'Text',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe('');
    }
  });

  it('accepts explicit subject', () => {
    const result = MessageTemplateCreateSchema.safeParse({
      title: 'Vorlage',
      subject: 'Betreff',
      body: 'Text',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe('Betreff');
    }
  });

  it('rejects empty title (min 1)', () => {
    const result = MessageTemplateCreateSchema.safeParse({
      title: '',
      body: 'Text',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty body (min 1)', () => {
    const result = MessageTemplateCreateSchema.safeParse({
      title: 'Vorlage',
      body: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = MessageTemplateCreateSchema.safeParse({ body: 'Text' });
    expect(result.success).toBe(false);
  });

  it('rejects missing body', () => {
    const result = MessageTemplateCreateSchema.safeParse({ title: 'Vorlage' });
    expect(result.success).toBe(false);
  });
});

// --- MessageTemplateUpdateSchema ---

describe('MessageTemplateUpdateSchema', () => {
  it('parses valid full update', () => {
    const result = MessageTemplateUpdateSchema.safeParse({
      title: 'Neuer Titel',
      subject: 'Neuer Betreff',
      body: 'Neuer Text',
    });
    expect(result.success).toBe(true);
  });

  it('parses partial update with only title', () => {
    const result = MessageTemplateUpdateSchema.safeParse({ title: 'Titel' });
    expect(result.success).toBe(true);
  });

  it('parses partial update with only body', () => {
    const result = MessageTemplateUpdateSchema.safeParse({ body: 'Text' });
    expect(result.success).toBe(true);
  });

  it('parses empty object (all fields optional)', () => {
    const result = MessageTemplateUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects empty title when provided (min 1)', () => {
    const result = MessageTemplateUpdateSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty body when provided (min 1)', () => {
    const result = MessageTemplateUpdateSchema.safeParse({ body: '' });
    expect(result.success).toBe(false);
  });

  it('accepts empty subject (no min constraint)', () => {
    const result = MessageTemplateUpdateSchema.safeParse({ subject: '' });
    expect(result.success).toBe(true);
  });
});
