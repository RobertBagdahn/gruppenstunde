/**
 * Tests for messaging Zod schemas.
 */
import { describe, it, expect } from 'vitest';
import {
  MessageChannelSchema,
  RecipientTypeSchema,
  MessageFilterSchema,
  SendMessageSchema,
  WhatsAppStatusSchema,
  RecipientPreviewSchema,
  MessagePreviewSchema,
  FailedRecipientSchema,
  SendMessageResultSchema,
} from '@/schemas/messaging';

// --- MessageChannelSchema ---

describe('MessageChannelSchema', () => {
  it('accepts "email"', () => {
    expect(MessageChannelSchema.safeParse('email').success).toBe(true);
  });

  it('accepts "whatsapp"', () => {
    expect(MessageChannelSchema.safeParse('whatsapp').success).toBe(true);
  });

  it('rejects invalid channel', () => {
    expect(MessageChannelSchema.safeParse('sms').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(MessageChannelSchema.safeParse('').success).toBe(false);
  });
});

// --- RecipientTypeSchema ---

describe('RecipientTypeSchema', () => {
  it('accepts all valid values', () => {
    for (const value of ['all', 'filtered', 'selected']) {
      expect(RecipientTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects invalid value', () => {
    expect(RecipientTypeSchema.safeParse('none').success).toBe(false);
  });
});

// --- MessageFilterSchema ---

describe('MessageFilterSchema', () => {
  it('parses valid full filter', () => {
    const result = MessageFilterSchema.safeParse({
      is_paid: true,
      booking_option_id: 5,
      label_id: 3,
    });
    expect(result.success).toBe(true);
  });

  it('parses empty object (all fields optional)', () => {
    const result = MessageFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts null for nullable fields', () => {
    const result = MessageFilterSchema.safeParse({
      is_paid: null,
      booking_option_id: null,
      label_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-boolean is_paid', () => {
    const result = MessageFilterSchema.safeParse({ is_paid: 'yes' });
    expect(result.success).toBe(false);
  });

  it('rejects non-number booking_option_id', () => {
    const result = MessageFilterSchema.safeParse({ booking_option_id: 'abc' });
    expect(result.success).toBe(false);
  });
});

// --- SendMessageSchema ---

describe('SendMessageSchema', () => {
  const validMessage = {
    channel: 'email',
    subject: 'Betreff',
    body: 'Nachricht',
    recipient_type: 'all',
  };

  it('parses valid minimal data', () => {
    const result = SendMessageSchema.safeParse(validMessage);
    expect(result.success).toBe(true);
  });

  it('parses valid data with all optional fields', () => {
    const result = SendMessageSchema.safeParse({
      ...validMessage,
      filters: { is_paid: true },
      participant_ids: [1, 2, 3],
      template_id: 7,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for optional nullable fields', () => {
    const result = SendMessageSchema.safeParse({
      ...validMessage,
      filters: null,
      participant_ids: null,
      template_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid channel', () => {
    const result = SendMessageSchema.safeParse({
      ...validMessage,
      channel: 'telegram',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid recipient_type', () => {
    const result = SendMessageSchema.safeParse({
      ...validMessage,
      recipient_type: 'everyone',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty body (min 1)', () => {
    const result = SendMessageSchema.safeParse({
      ...validMessage,
      body: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing channel', () => {
    const { channel, ...rest } = validMessage;
    const result = SendMessageSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing body', () => {
    const { body, ...rest } = validMessage;
    const result = SendMessageSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing recipient_type', () => {
    const { recipient_type, ...rest } = validMessage;
    const result = SendMessageSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-array participant_ids', () => {
    const result = SendMessageSchema.safeParse({
      ...validMessage,
      participant_ids: 'not-an-array',
    });
    expect(result.success).toBe(false);
  });
});

// --- WhatsAppStatusSchema ---

describe('WhatsAppStatusSchema', () => {
  it('accepts all valid status values', () => {
    const values = [
      'available',
      'unavailable',
      'no_phone',
      'no_contact',
      'not_applicable',
      'unknown',
    ];
    for (const value of values) {
      expect(WhatsAppStatusSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(WhatsAppStatusSchema.safeParse('offline').success).toBe(false);
  });
});

// --- RecipientPreviewSchema ---

describe('RecipientPreviewSchema', () => {
  const validRecipient = {
    participant_id: 1,
    name: 'Max Mustermann',
    contact: 'max@example.com',
    whatsapp_status: 'available',
  };

  it('parses valid data', () => {
    const result = RecipientPreviewSchema.safeParse(validRecipient);
    expect(result.success).toBe(true);
  });

  it('rejects missing participant_id', () => {
    const { participant_id, ...rest } = validRecipient;
    const result = RecipientPreviewSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validRecipient;
    const result = RecipientPreviewSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid whatsapp_status', () => {
    const result = RecipientPreviewSchema.safeParse({
      ...validRecipient,
      whatsapp_status: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

// --- MessagePreviewSchema ---

describe('MessagePreviewSchema', () => {
  const validPreview = {
    recipients: [
      {
        participant_id: 1,
        name: 'Max',
        contact: 'max@example.com',
        whatsapp_status: 'available',
      },
    ],
    total_count: 10,
    reachable_count: 8,
    unreachable_count: 2,
    channel: 'email',
    sample_message: 'Hallo Max, ...',
  };

  it('parses valid data', () => {
    const result = MessagePreviewSchema.safeParse(validPreview);
    expect(result.success).toBe(true);
  });

  it('parses with empty recipients array', () => {
    const result = MessagePreviewSchema.safeParse({
      ...validPreview,
      recipients: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing total_count', () => {
    const { total_count, ...rest } = validPreview;
    const result = MessagePreviewSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid channel in preview', () => {
    const result = MessagePreviewSchema.safeParse({
      ...validPreview,
      channel: 'telegram',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid recipient in array', () => {
    const result = MessagePreviewSchema.safeParse({
      ...validPreview,
      recipients: [{ participant_id: 'not-a-number' }],
    });
    expect(result.success).toBe(false);
  });
});

// --- FailedRecipientSchema ---

describe('FailedRecipientSchema', () => {
  const validFailed = {
    participant_id: 1,
    phone_number: '+491234567890',
    email: 'test@example.com',
    error: 'Connection refused',
  };

  it('parses valid data', () => {
    const result = FailedRecipientSchema.safeParse(validFailed);
    expect(result.success).toBe(true);
  });

  it('rejects missing participant_id', () => {
    const { participant_id, ...rest } = validFailed;
    const result = FailedRecipientSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing error', () => {
    const { error, ...rest } = validFailed;
    const result = FailedRecipientSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing phone_number', () => {
    const { phone_number, ...rest } = validFailed;
    const result = FailedRecipientSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const { email, ...rest } = validFailed;
    const result = FailedRecipientSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// --- SendMessageResultSchema ---

describe('SendMessageResultSchema', () => {
  it('parses valid data with no failures', () => {
    const result = SendMessageResultSchema.safeParse({
      sent_count: 10,
      failed_count: 0,
      failed_recipients: [],
    });
    expect(result.success).toBe(true);
  });

  it('parses valid data with failed recipients', () => {
    const result = SendMessageResultSchema.safeParse({
      sent_count: 8,
      failed_count: 2,
      failed_recipients: [
        {
          participant_id: 1,
          phone_number: '+49123',
          email: 'a@b.com',
          error: 'timeout',
        },
        {
          participant_id: 2,
          phone_number: '+49456',
          email: 'c@d.com',
          error: 'invalid number',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing sent_count', () => {
    const result = SendMessageResultSchema.safeParse({
      failed_count: 0,
      failed_recipients: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing failed_recipients', () => {
    const result = SendMessageResultSchema.safeParse({
      sent_count: 5,
      failed_count: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid failed_recipient entry', () => {
    const result = SendMessageResultSchema.safeParse({
      sent_count: 5,
      failed_count: 1,
      failed_recipients: [{ participant_id: 'not-a-number' }],
    });
    expect(result.success).toBe(false);
  });
});
