import { describe, expect, it } from 'vitest';
import { ApiError, parseApiResponse } from './api';
import { isOverloadError, retryDelayMs, shouldRetryQuery, withOverloadRetry } from './queryRetry';

const cloudRun429 = () => new ApiError(429, '', {});

describe('shouldRetryQuery', () => {
  it('retries Cloud Run overload (429 without code) up to 3 times', () => {
    const error = cloudRun429();
    expect([0, 1, 2, 3].map((count) => shouldRetryQuery(count, error))).toEqual([true, true, true, false]);
  });

  it('retries 503 up to 3 times', () => {
    const error = new ApiError(503, '', {});
    expect([0, 2, 3].map((count) => shouldRetryQuery(count, error))).toEqual([true, true, false]);
  });

  it.each([401, 403, 404, 409, 422])('does not retry %i', (status) => {
    expect(shouldRetryQuery(0, new ApiError(status, '', {}))).toBe(false);
  });

  it('does not retry 429 raised by the backend itself (AI limits carry a code)', () => {
    const error = new ApiError(429, '', { code: 'ai_quota_exceeded', retry_after_seconds: 600 });
    expect(isOverloadError(error)).toBe(false);
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it('retries other failures once', () => {
    expect([0, 1].map((count) => shouldRetryQuery(count, new ApiError(500, '', {})))).toEqual([true, false]);
    expect([0, 1].map((count) => shouldRetryQuery(count, new TypeError('Failed to fetch')))).toEqual([true, false]);
  });
});

describe('retryDelayMs', () => {
  it('backs off 1 s, 2 s, 4 s plus jitter below 500 ms', () => {
    const error = cloudRun429();
    expect([0, 1, 2].map((count) => retryDelayMs(count, error, () => 0))).toEqual([1000, 2000, 4000]);
    expect(retryDelayMs(0, error, () => 0.999)).toBe(1499);
  });

  it('prefers the Retry-After header and caps it at 30 s', () => {
    const response = (value: string) =>
      parseApiResponse(new Response('slow down', { status: 429, headers: { 'Retry-After': value } }));
    return Promise.all([
      response('7').catch((error: unknown) => expect(retryDelayMs(0, error, () => 0.9)).toBe(7000)),
      response('120').catch((error: unknown) => expect(retryDelayMs(0, error)).toBe(30_000)),
    ]);
  });

  it('keeps the default backoff for non-overload errors', () => {
    expect(retryDelayMs(0, new ApiError(500, '', {}))).toBe(1000);
    expect(retryDelayMs(1, new ApiError(500, '', {}))).toBe(2000);
  });
});

describe('withOverloadRetry', () => {
  const noWait = () => Promise.resolve();

  it('repeats after overload and returns the first success', async () => {
    let calls = 0;
    const result = await withOverloadRetry(async () => {
      calls += 1;
      if (calls < 3) throw cloudRun429();
      return 'ok';
    }, noWait);
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('gives up after 3 repetitions and rethrows the overload error', async () => {
    let calls = 0;
    await expect(
      withOverloadRetry(async () => {
        calls += 1;
        throw cloudRun429();
      }, noWait),
    ).rejects.toMatchObject({ status: 429 });
    expect(calls).toBe(4);
  });

  it('does not repeat other errors', async () => {
    let calls = 0;
    await expect(
      withOverloadRetry(async () => {
        calls += 1;
        throw new ApiError(409, '', { detail: 'bereits übernommen' });
      }, noWait),
    ).rejects.toMatchObject({ status: 409 });
    expect(calls).toBe(1);
  });
});
