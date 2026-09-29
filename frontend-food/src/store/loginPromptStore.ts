/**
 * Global login prompt. Opened by guarded save actions and by 401 API errors.
 */
import { create } from 'zustand';

export type LoginPromptMode = 'login' | 'reauth';

interface LoginPromptState {
  open: boolean;
  reason: string;
  mode: LoginPromptMode;
  /** Path to return to after OAuth (defaults to the current location). */
  next: string | null;
  show: (options?: { reason?: string; mode?: LoginPromptMode; next?: string }) => void;
  close: () => void;
}

export const DEFAULT_LOGIN_REASON = 'Melde dich an, um deine Arbeit zu speichern.';

export const useLoginPrompt = create<LoginPromptState>((set) => ({
  open: false,
  reason: DEFAULT_LOGIN_REASON,
  mode: 'login',
  next: null,
  show: (options) =>
    set({
      open: true,
      reason: options?.reason ?? DEFAULT_LOGIN_REASON,
      mode: options?.mode ?? 'login',
      next: options?.next ?? null,
    }),
  close: () => set({ open: false }),
}));
