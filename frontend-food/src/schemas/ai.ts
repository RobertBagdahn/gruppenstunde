/**
 * AI quota. MUST stay in sync with backend/core/schemas.py (AiQuotaOut).
 */
import { z } from 'zod';

export const aiQuotaSchema = z.object({
  tier: z.enum(['anonymous', 'user', 'staff', 'system']),
  limit_eur: z.number(),
  used_eur: z.number(),
  remaining_eur: z.number(),
  used_percent: z.number(),
  resets_at: z.string(),
  anonymous_features: z.array(z.string()),
  visitor_remaining_percent: z.number().nullable().optional(),
});
export type AiQuota = z.infer<typeof aiQuotaSchema>;
