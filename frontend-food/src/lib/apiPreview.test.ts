import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('fetchWithCsrf in preview builds', () => {
  it('rejects writes with a German message and never calls fetch', async () => {
    vi.stubEnv('VITE_PREVIEW', '1');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { fetchWithCsrf } = await import('./api');

    await expect(fetchWithCsrf('/api/recipes/', { method: 'POST' })).rejects.toMatchObject({
      status: 403,
      code: 'preview_readonly',
      message: 'Vorschau – nur ansehen. Änderungen sind hier nicht möglich.',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('still lets reads and sign-in through', async () => {
    vi.stubEnv('VITE_PREVIEW', '1');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const { fetchWithCsrf } = await import('./api');

    await fetchWithCsrf('/api/recipes/');
    await fetchWithCsrf('/api/auth/login/', { method: 'POST' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
