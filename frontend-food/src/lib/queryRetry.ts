import { ApiError } from '@/lib/api';

/** Retries after the first attempt; enough to ride out a short overload without making it worse. */
export const MAX_QUERY_RETRIES = 2;

/**
 * Overload (429) and server or network failures are transient and may succeed on a retry.
 * Other client errors (400, 403, 404 …) would fail the same way again.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429 || error.status >= 500;
  // fetch() rejects with a TypeError when the network is unreachable.
  return error instanceof TypeError;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return isTransientError(error) && failureCount < MAX_QUERY_RETRIES;
}

/** Honours the server's Retry-After hint; otherwise backs off 1 s, 2 s, … up to 8 s. */
export function queryRetryDelay(failureCount: number, error: unknown): number {
  if (error instanceof ApiError && error.retryAfterSeconds !== undefined) {
    return Math.min(error.retryAfterSeconds, 30) * 1000;
  }
  return Math.min(1000 * 2 ** failureCount, 8000);
}
