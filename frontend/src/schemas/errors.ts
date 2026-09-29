/**
 * Unified API error body. MUST stay in sync with backend/core/schemas.py (ErrorOut).
 */
import { z } from 'zod';

export const apiErrorSchema = z.object({
  detail: z.string(),
  code: z.string(),
  retry_after_seconds: z.number().nullable().optional(),
});
export type ApiErrorPayload = z.infer<typeof apiErrorSchema>;

/** Codes the UI branches on (see openspec auth-error-contract). */
export const AUTH_ERROR_CODES = ['auth_required', 'reauth_required', 'ai_login_required'] as const;
export const AI_LIMIT_CODES = [
  'ai_quota_exceeded',
  'ai_public_budget_exhausted',
  'ai_visitor_limit',
  'ai_rate_limited',
] as const;
