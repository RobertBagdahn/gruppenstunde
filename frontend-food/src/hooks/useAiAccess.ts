/**
 * Decides up front whether an AI action is usable, so buttons can show a lock
 * (login needed) or a disabled state (quota used up) instead of failing on click.
 * The backend stays authoritative; this only mirrors /api/ai/quota/ for the UI.
 */
import { useCallback } from 'react';
import { notify } from '@/lib/notify';
import { useAiQuota } from '@/api/ai';
import { useCurrentUser } from '@/api/auth';
import { useLoginPrompt } from '@/store/loginPromptStore';

export type AiAccessStatus = 'available' | 'login' | 'exhausted';

interface AiAccessOptions {
  /** True for "Rezept erkennen" / "Zutat erkennen" (anonymous allowlist). */
  anonymousAllowed?: boolean;
  /** What the feature does, shown in the login dialog for visitors. */
  description?: string;
}

const DEFAULT_DESCRIPTION = 'Der KI-Assistent hilft dir beim Ausfüllen und Verbessern.';
export const AI_EXHAUSTED_USER = 'Dein KI-Kontingent für heute ist aufgebraucht. Morgen ab 0:00 Uhr geht es weiter.';
export const AI_EXHAUSTED_VISITOR =
  'Die kostenlose KI-Vorschau ist gerade ausgelastet. Melde dich an, dann hast du dein eigenes Kontingent.';

export function useAiAccess({ anonymousAllowed = false, description = DEFAULT_DESCRIPTION }: AiAccessOptions = {}) {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const needsQuota = !!user || anonymousAllowed;
  const { data: quota } = useAiQuota(needsQuota);
  const showLogin = useLoginPrompt((state) => state.show);

  let status: AiAccessStatus = 'available';
  let hint = '';
  if (!userLoading && !user && !anonymousAllowed) {
    status = 'login';
    hint = 'KI-Funktionen gibt es nach der kostenlosen Anmeldung.';
  } else if (quota && user && quota.used_percent >= 100) {
    status = 'exhausted';
    hint = AI_EXHAUSTED_USER;
  } else if (quota && !user && (quota.used_percent >= 100 || quota.visitor_remaining_percent === 0)) {
    status = 'exhausted';
    hint = AI_EXHAUSTED_VISITOR;
  }

  /** Wraps a click handler: opens the login dialog or explains the limit instead of calling it. */
  const guard = useCallback(
    <Args extends unknown[]>(action: (...args: Args) => void) =>
      (...args: Args) => {
        if (status === 'login') {
          showLogin({ reason: `${description} Nach der kostenlosen Anmeldung steht er dir zur Verfügung.` });
          return;
        }
        if (status === 'exhausted') {
          notify.warning(hint, { id: 'ai-exhausted' });
          return;
        }
        action(...args);
      },
    [status, hint, description, showLogin],
  );

  return {
    status,
    hint,
    /** Visually locked: keep the button clickable (it opens the login dialog). */
    locked: status === 'login',
    /** Quota used up: render the button disabled with `hint` as explanation. */
    disabled: status === 'exhausted',
    guard,
  };
}
