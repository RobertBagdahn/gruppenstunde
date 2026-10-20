import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError, apiGet } from './client';

const schema = z.object({ value: z.number() });

function respond(body: string, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('returns validated data', async () => {
    respond(JSON.stringify({ value: 3 }));
    await expect(apiGet('/api/x', schema)).resolves.toEqual({ value: 3 });
  });

  it('uses the detail message of an error response', async () => {
    respond(JSON.stringify({ detail: 'Artikel nicht gefunden.' }), 404);
    await expect(apiGet('/api/x', schema)).rejects.toMatchObject({ message: 'Artikel nicht gefunden.', status: 404 });
  });

  it('falls back to the HTTP status when the error body is not JSON', async () => {
    respond('Bad Gateway', 502);
    await expect(apiGet('/api/x', schema)).rejects.toMatchObject({
      message: 'Anfrage fehlgeschlagen (HTTP 502).',
      status: 502,
    });
  });

  it('reports an unreachable server with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(apiGet('/api/x', schema)).rejects.toMatchObject({ message: 'Server nicht erreichbar.', status: 0 });
  });

  it('rejects responses that do not match the schema', async () => {
    respond(JSON.stringify({ value: 'drei' }));
    const error = await apiGet('/api/x', schema).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Antwort des Servers hat ein unerwartetes Format.');
  });

  it('rejects invalid JSON', async () => {
    respond('<html>');
    await expect(apiGet('/api/x', schema)).rejects.toMatchObject({ message: 'Antwort des Servers ist kein gültiges JSON.' });
  });
});
