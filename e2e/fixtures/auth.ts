import type { Page } from '@playwright/test';

/**
 * Logs in via the dev-only endpoint (AUTH_DEV_LOGIN_ENABLED, never in production).
 * Uses page.request so the session cookie lands in the page's browser context.
 */
export async function devLogin(page: Page, email: string, baseUrl: string): Promise<void> {
  const csrfResponse = await page.request.get(`${baseUrl}/api/auth/csrf/`);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await page.request.post(`${baseUrl}/api/auth/dev-login/`, {
    data: { email },
    headers: { 'X-CSRFToken': csrfToken, Referer: `${baseUrl}/` },
  });
  if (!response.ok()) {
    throw new Error(`Dev login failed (${response.status()}): ${await response.text()}`);
  }
}
