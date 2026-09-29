/**
 * Central reaction to API error codes (openspec auth-error-contract):
 * 401 codes open the login dialog, AI limits show an explanatory toast.
 * Other errors stay with the page (error states / page toasts).
 */
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { useLoginPrompt } from '@/store/loginPromptStore';

function formatRetry(seconds: number | undefined): string {
  if (!seconds) return '';
  const target = new Date(Date.now() + seconds * 1000);
  return ` Wieder verfügbar ab ${target.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr.`;
}

/** Returns true when the error was handled globally. */
export function handleGlobalApiError(error: unknown): boolean {
  if (!(error instanceof ApiError) || !error.code) return false;
  const prompt = useLoginPrompt.getState();
  switch (error.code) {
    case 'auth_required':
    case 'ai_login_required':
      prompt.show({ reason: error.message });
      return true;
    case 'reauth_required':
      prompt.show({ reason: error.message, mode: 'reauth' });
      return true;
    case 'ai_quota_exceeded':
    case 'ai_public_budget_exhausted':
    case 'ai_visitor_limit':
    case 'ai_rate_limited':
      toast.warning(error.message + (error.code === 'ai_quota_exceeded' ? '' : formatRetry(error.retryAfterSeconds)), {
        id: `ai-limit-${error.code}`,
      });
      return true;
    default:
      return false;
  }
}
