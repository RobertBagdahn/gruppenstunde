/**
 * CSRF token helpers for authenticated API requests.
 * Shared across all API hook files.
 */

/**
 * Base URL for all API requests.
 * In production, points directly to the backend Cloud Run service.
 * In development, uses relative /api/ path (Vite proxy).
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

type ApiErrorListener = (error: ApiError) => void;
let apiErrorListener: ApiErrorListener | null = null;

/**
 * Registers the central reaction to coded API errors (login dialog, AI-limit toasts).
 * Hooks keep their own error handling; this only adds the global behaviour.
 */
export function setApiErrorListener(listener: ApiErrorListener | null): void {
  apiErrorListener = listener;
}

const GLOBAL_ERROR_CODES = new Set([
  'auth_required',
  'reauth_required',
  'ai_login_required',
  'ai_quota_exceeded',
  'ai_public_budget_exhausted',
  'ai_visitor_limit',
  'ai_rate_limited',
]);

async function notifyCodedError(response: Response): Promise<void> {
  if (!apiErrorListener || (response.status !== 401 && response.status !== 429)) return;
  try {
    const body = (await response.clone().json()) as ApiErrorBody;
    if (typeof body.code === 'string' && GLOBAL_ERROR_CODES.has(body.code)) {
      apiErrorListener(new ApiError(response.status, response.statusText, body));
    }
  } catch {
    // Non-JSON error bodies are left to the calling hook.
  }
}

export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      ...options.headers,
    },
  });
  if (!response.ok) await notifyCodedError(response);
  return response;
}

export type ApiErrorBody = {
  detail?: unknown;
  message?: unknown;
  code?: unknown;
  errors?: unknown;
  error_code?: unknown;
  retry_after_seconds?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: unknown;
  readonly retryAfterSeconds?: number;

  // statusText is kept for call compatibility but never shown: users see German `detail` texts only.
  constructor(status: number, _statusText: string, body: ApiErrorBody = {}) {
    super(formatApiErrorBody(body) || `Ein Fehler ist aufgetreten (${status}).`);
    this.name = 'ApiError';
    this.status = status;
    const code = typeof body.code === 'string' ? body.code : body.error_code;
    this.code = typeof code === 'string' ? code : undefined;
    this.details = body.errors;
    this.retryAfterSeconds = typeof body.retry_after_seconds === 'number' ? body.retry_after_seconds : undefined;
  }
}

function formatApiErrorBody(body: ApiErrorBody): string | null {
  const detail = body.detail ?? body.message;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => formatApiErrorBody(item as ApiErrorBody) ?? String(item)).join(', ');
  }
  if (detail && typeof detail === 'object') {
    return Object.entries(detail)
      .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join('; ');
  }
  if (body.errors && typeof body.errors === 'object') {
    return Object.entries(body.errors as Record<string, unknown>)
      .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join('; ');
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback = 'Ein unerwarteter Fehler ist aufgetreten.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Parse a JSON API response and preserve structured backend errors. */
export async function parseApiResponse<T>(response: Response, schema?: { parse(data: unknown): T }): Promise<T> {
  let body: unknown = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      body && typeof body === 'object' ? body as ApiErrorBody : {},
    );
  }
  return schema ? schema.parse(body) : body as T;
}
