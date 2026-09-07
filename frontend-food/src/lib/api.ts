
export type ApiErrorBody = {
  detail?: unknown;
  message?: unknown;
  code?: unknown;
  errors?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: unknown;

  constructor(status: number, statusText: string, body: ApiErrorBody = {}) {
    super(formatApiErrorBody(body) || `API-Fehler (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof body.code === 'string' ? body.code : undefined;
    this.details = body.errors;
    if (statusText) this.message = `${this.message} (${statusText})`;
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
