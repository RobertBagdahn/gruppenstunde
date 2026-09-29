/**
 * Starts the OAuth flow via a real form POST (allauth requires POST + CSRF so a
 * GET link can never trigger a login). The browser leaves the SPA; drafts must
 * be saved before calling this.
 */
import { API_BASE_URL, getCsrfToken } from '@/lib/api';

export type SocialLoginProcess = 'login' | 'connect';

async function ensureCsrfToken(): Promise<string> {
  const existing = getCsrfToken();
  if (existing) return existing;
  await fetch(`${API_BASE_URL}/api/auth/csrf/`, { credentials: 'include' });
  return getCsrfToken();
}

/** Only same-site relative paths are allowed as return targets. */
export function safeNextPath(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  return candidate;
}

export async function startSocialLogin(
  loginUrl: string,
  next: string,
  process: SocialLoginProcess = 'login',
): Promise<void> {
  const token = await ensureCsrfToken();
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${API_BASE_URL}${loginUrl}`;
  const fields: Record<string, string> = {
    csrfmiddlewaretoken: token,
    next: safeNextPath(next),
    process,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

/** German texts for `?error=` codes set by the backend adapter after an OAuth round trip. */
export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  cancelled: 'Die Anmeldung wurde abgebrochen. Du kannst es jederzeit erneut versuchen.',
  provider_error: 'Beim Anbieter ist ein Fehler aufgetreten. Bitte versuche es erneut oder wähle einen anderen Anbieter.',
  email_missing:
    'Wir brauchen deine E-Mail-Adresse, um dein Konto anzulegen. Bitte erlaube den Zugriff darauf beim Anbieter.',
  email_conflict:
    'Zu dieser E-Mail gibt es schon ein Konto. Melde dich mit dem Anbieter an, den du bisher genutzt hast.',
  connected_other: 'Dieses Konto ist bereits mit einem anderen Inspi-Konto verbunden.',
};
