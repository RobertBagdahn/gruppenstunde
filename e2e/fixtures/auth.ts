import type { Page } from '@playwright/test';

async function csrfToken(page: Page, baseUrl: string): Promise<string> {
  const response = await page.request.get(`${baseUrl}/api/auth/csrf/`);
  const { csrfToken: token } = (await response.json()) as { csrfToken: string };
  return token;
}

/**
 * Logs in via the dev-only endpoint (AUTH_DEV_LOGIN_ENABLED, never in production).
 * Uses page.request so the session cookie lands in the page's browser context.
 *
 * A first login opens the "Willkommen bei Inspi!" onboarding dialog, which
 * covers the page and blocks every click. Tests are not about onboarding, so
 * it is completed here via the API (same as skipping it in the dialog).
 */
export async function devLogin(page: Page, email: string, baseUrl: string): Promise<void> {
  const response = await page.request.post(`${baseUrl}/api/auth/dev-login/`, {
    data: { email },
    headers: { 'X-CSRFToken': await csrfToken(page, baseUrl), Referer: `${baseUrl}/` },
  });
  if (!response.ok()) {
    throw new Error(`Dev login failed (${response.status()}): ${await response.text()}`);
  }
  const user = (await response.json()) as { needs_onboarding?: boolean };
  if (!user.needs_onboarding) return;

  // Login rotates the CSRF token, so fetch a fresh one for the session.
  const onboarding = await page.request.post(`${baseUrl}/api/profile/me/onboarding/`, {
    data: {},
    headers: { 'X-CSRFToken': await csrfToken(page, baseUrl), Referer: `${baseUrl}/` },
  });
  if (!onboarding.ok()) {
    throw new Error(`Completing onboarding failed (${onboarding.status()}): ${await onboarding.text()}`);
  }
}
