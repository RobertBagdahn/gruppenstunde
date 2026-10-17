import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api';
import { isTransientError, queryRetryDelay, shouldRetryQuery, MAX_QUERY_RETRIES } from './queryRetry';

const apiError = (status: number, retryAfterSeconds?: number) =>
  new ApiError(status, '', retryAfterSeconds === undefined ? {} : { retry_after_seconds: retryAfterSeconds });

describe('isTransientError', () => {
  it('treats overload and server errors as transient', () => {
    expect(isTransientError(apiError(429))).toBe(true);
    expect(isTransientError(apiError(500))).toBe(true);
    expect(isTransientError(apiError(503))).toBe(true);
  });

  it('treats network failures as transient', () => {
    expect(isTransientError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('does not retry client errors that would fail again', () => {
    expect(isTransientError(apiError(400))).toBe(false);
    expect(isTransientError(apiError(401))).toBe(false);
    expect(isTransientError(apiError(403))).toBe(false);
    expect(isTransientError(apiError(404))).toBe(false);
    expect(isTransientError(new Error('plain'))).toBe(false);
  });
});

describe('shouldRetryQuery', () => {
  it('retries transient errors until the limit is reached', () => {
    expect(shouldRetryQuery(0, apiError(429))).toBe(true);
    expect(shouldRetryQuery(MAX_QUERY_RETRIES - 1, apiError(429))).toBe(true);
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, apiError(429))).toBe(false);
  });

  it('never retries a 404', () => {
    expect(shouldRetryQuery(0, apiError(404))).toBe(false);
  });
});

describe('queryRetryDelay', () => {
  it('backs off exponentially and caps at 8 seconds', () => {
    expect(queryRetryDelay(0, apiError(429))).toBe(1000);
    expect(queryRetryDelay(1, apiError(429))).toBe(2000);
    expect(queryRetryDelay(5, apiError(429))).toBe(8000);
  });

  it('honours the Retry-After hint from the server, within a 30 second cap', () => {
    expect(queryRetryDelay(0, apiError(429, 3))).toBe(3000);
    expect(queryRetryDelay(0, apiError(429, 600))).toBe(30000);
  });
});
