
export type ApiErrorBody = {
  detail?: unknown;
  message?: unknown;
  code?: unknown;
  errors?: unknown;
  error_code?: unknown;
  retry_after_seconds?: unknown;
  fields?: unknown;
  existing?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: unknown;
  readonly retryAfterSeconds?: number;
  /** Field names the backend flagged (e.g. nutrition validation), when present. */
  readonly fields: string[];
  /** Existing entity of a duplicate (409), when present. */
  readonly existing?: { id: number; slug: string; name: string };

  // statusText is kept for call compatibility but never shown: users see German `detail` texts only.
  constructor(status: number, _statusText: string, body: ApiErrorBody = {}) {
    super(formatApiErrorBody(body) || `Ein Fehler ist aufgetreten (${status}).`);
    this.name = 'ApiError';
    this.status = status;
    const code = typeof body.code === 'string' ? body.code : body.error_code;
    this.code = typeof code === 'string' ? code : undefined;
    this.details = body.errors;
    this.retryAfterSeconds = typeof body.retry_after_seconds === 'number' ? body.retry_after_seconds : undefined;
    this.fields = Array.isArray(body.fields) ? body.fields.filter((field): field is string => typeof field === 'string') : [];
    const existing = body.existing as { id?: unknown; slug?: unknown; name?: unknown } | undefined;
    if (existing && typeof existing.id === 'number' && typeof existing.slug === 'string' && typeof existing.name === 'string') {
      this.existing = { id: existing.id, slug: existing.slug, name: existing.name };
    }
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

export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      ...options.headers,
    },
  });
}
