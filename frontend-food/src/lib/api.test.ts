import { describe, expect, it } from 'vitest';
import { ApiError, parseApiResponse } from './api';

describe('parseApiResponse', () => {
  it('preserves backend validation details in the user-facing message', async () => {
    const response = new Response(JSON.stringify({ detail: { name: ['Name ist erforderlich'] }, code: 'validation_error' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseApiResponse(response)).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      code: 'validation_error',
      message: 'name: Name ist erforderlich',
    } satisfies Partial<ApiError>);
  });

  it('preserves the HTTP status and request reference for non-JSON server errors', async () => {
    const response = new Response('<html>Internal Server Error</html>', {
      status: 500,
      headers: { 'X-Request-ID': 'request-abc123' },
    });

    await expect(parseApiResponse(response)).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      requestId: 'request-abc123',
      message: 'Serverfehler (HTTP 500). Bitte versuche es später erneut. Referenz: request-abc123',
    } satisfies Partial<ApiError>);
  });

  it('does not show internal backend details for server errors', async () => {
    const response = new Response(JSON.stringify({ detail: 'SQL password leaked', code: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'req-safe' },
    });

    await expect(parseApiResponse(response)).rejects.toMatchObject({
      status: 500,
      message: 'Serverfehler (HTTP 500). Bitte versuche es später erneut. Referenz: req-safe',
    });
  });

  it('parses successful JSON responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    await expect(parseApiResponse<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
  });
});
