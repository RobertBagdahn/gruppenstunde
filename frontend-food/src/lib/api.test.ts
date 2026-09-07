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

  it('parses successful JSON responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    await expect(parseApiResponse<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
  });
});
