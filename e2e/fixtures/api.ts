import type { APIRequestContext, APIResponse } from '@playwright/test';

export async function responseJson(response: APIResponse): Promise<unknown> {
  return response.status() === 204 ? null : response.json() as Promise<unknown>;
}

export async function expectJsonResponse(response: APIResponse, expectedStatus = 200): Promise<unknown> {
  if (response.status() !== expectedStatus) {
    const body = await response.text();
    throw new Error(`Expected HTTP ${expectedStatus}, got ${response.status()}: ${body}`);
  }
  return responseJson(response);
}

export async function getCsrfToken(api: APIRequestContext): Promise<string> {
  const response = await api.get('/api/auth/csrf/');
  const body = await expectJsonResponse(response);
  if (!body || typeof body !== 'object' || !('csrfToken' in body) || typeof body.csrfToken !== 'string') {
    throw new Error('CSRF endpoint returned an invalid response');
  }
  return body.csrfToken;
}

export function assertRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object');
  }
  return value as Record<string, unknown>;
}
