import { ApiError } from './api';

/** Retries of a read request that the backend turned away because it had no free capacity. */
export const MAX_OVERLOAD_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const JITTER_MS = 500;

/**
 * Cloud Run answers 429 ("no available instance") without a JSON body, so the error has no `code`;
 * every 429 the backend raises itself (AI limits, rate limits) carries one and must not be retried.
 */
export function isOverloadError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 503 || (error.status === 429 && !error.code));
}

/** TanStack Query `retry`: overload up to 3 times, other 4xx never, anything else once. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isOverloadError(error)) return failureCount < MAX_OVERLOAD_RETRIES;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

/** TanStack Query `retryDelay`: 1 s, 2 s, 4 s plus up to 500 ms jitter; `Retry-After` wins (capped at 30 s). */
export function retryDelayMs(failureCount: number, error: unknown, random: () => number = Math.random): number {
  if (!isOverloadError(error)) return Math.min(BASE_DELAY_MS * 2 ** failureCount, MAX_DELAY_MS);
  if (error.retryAfterHeaderSeconds !== undefined) return Math.min(error.retryAfterHeaderSeconds * 1000, MAX_DELAY_MS);
  return Math.min(BASE_DELAY_MS * 2 ** failureCount, MAX_DELAY_MS) + Math.floor(random() * JITTER_MS);
}
