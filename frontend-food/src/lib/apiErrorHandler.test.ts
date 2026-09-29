import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { useLoginPrompt } from '@/store/loginPromptStore';
import { handleGlobalApiError } from './apiErrorHandler';

const toastWarning = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { warning: toastWarning } }));

beforeEach(() => {
  useLoginPrompt.setState({ open: false, mode: 'login' });
  toastWarning.mockClear();
});

describe('handleGlobalApiError', () => {
  it('opens the login dialog for auth_required with the backend text', () => {
    const error = new ApiError(401, 'Unauthorized', {
      detail: 'Bitte melde dich an, um das zu speichern.',
      code: 'auth_required',
    });
    expect(handleGlobalApiError(error)).toBe(true);
    expect(useLoginPrompt.getState().open).toBe(true);
    expect(useLoginPrompt.getState().reason).toBe('Bitte melde dich an, um das zu speichern.');
  });

  it('uses reauth mode for reauth_required', () => {
    handleGlobalApiError(new ApiError(401, '', { detail: 'Bitte erneut', code: 'reauth_required' }));
    expect(useLoginPrompt.getState().mode).toBe('reauth');
  });

  it('shows a toast for AI limits', () => {
    const error = new ApiError(429, '', {
      detail: 'Die kostenlose KI-Vorschau ist gerade ausgelastet.',
      code: 'ai_public_budget_exhausted',
      retry_after_seconds: 600,
    });
    expect(handleGlobalApiError(error)).toBe(true);
    expect(toastWarning).toHaveBeenCalledOnce();
    expect(useLoginPrompt.getState().open).toBe(false);
  });

  it('leaves permission errors to the page', () => {
    expect(handleGlobalApiError(new ApiError(403, '', { detail: 'x', code: 'permission_denied' }))).toBe(false);
    expect(useLoginPrompt.getState().open).toBe(false);
  });

  it('never shows English status texts', () => {
    const error = new ApiError(401, 'Unauthorized', { detail: 'Bitte melde dich an.', code: 'auth_required' });
    expect(error.message).toBe('Bitte melde dich an.');
  });
});
