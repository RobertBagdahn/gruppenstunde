
export type ApiErrorBody = {
  detail?: unknown;
  message?: unknown;
  code?: unknown;
  errors?: unknown;
  error_code?: unknown;
  retry_after_seconds?: unknown;
  fields?: unknown;
  existing?: unknown;
  request_id?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: unknown;
  readonly retryAfterSeconds?: number;
  /** Field names the backend flagged (e.g. nutrition validation), when present. */
  readonly fields: string[];
  /** German message per field of a 422 validation error, when present. */
  readonly fieldMessages: Record<string, string>;
  /** Existing entity of a duplicate (409), when present. */
  readonly existing?: { id: number; slug: string; name: string };
  readonly requestId?: string;

  constructor(status: number, _statusText: string, body: ApiErrorBody = {}, requestId?: string) {
    const bodyRequestId = typeof body.request_id === 'string' ? body.request_id : undefined;
    const resolvedRequestId = bodyRequestId ?? requestId;
    const supportReference = resolvedRequestId ? ` Referenz: ${resolvedRequestId}` : '';
    const message = status >= 500
      ? `Serverfehler (HTTP ${status}). Bitte versuche es später erneut.${supportReference}`
      : formatApiErrorBody(body) || `Ein Fehler ist aufgetreten (${status}).`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    const code = typeof body.code === 'string' ? body.code : body.error_code;
    this.code = typeof code === 'string' ? code : undefined;
    this.details = body.errors;
    this.retryAfterSeconds = typeof body.retry_after_seconds === 'number' ? body.retry_after_seconds : undefined;
    this.fields = Array.isArray(body.fields)
      ? body.fields.filter((field): field is string => typeof field === 'string')
      : validationFields(body.detail);
    this.fieldMessages = validationFieldMessages(body.detail);
    const existing = body.existing as { id?: unknown; slug?: unknown; name?: unknown } | undefined;
    if (existing && typeof existing.id === 'number' && typeof existing.slug === 'string' && typeof existing.name === 'string') {
      this.existing = { id: existing.id, slug: existing.slug, name: existing.name };
    }
    this.requestId = resolvedRequestId;
  }
}

/** German texts for the most common Pydantic validation messages. */
const VALIDATION_MESSAGES: [RegExp, string][] = [
  [/^field required$/i, 'Pflichtfeld fehlt'],
  [/^input should be a valid (integer|number)/i, 'muss eine Zahl sein'],
  [/^input should be greater than (or equal to )?/i, 'ist zu klein'],
  [/^input should be less than (or equal to )?/i, 'ist zu groß'],
  [/^string should have at most/i, 'ist zu lang'],
  [/^string should have at least/i, 'ist zu kurz'],
  [/^input should be a valid/i, 'hat ein ungültiges Format'],
  [/^value error, /i, ''],
];

function translateValidationMessage(message: string): string {
  for (const [pattern, german] of VALIDATION_MESSAGES) {
    if (pattern.test(message)) return german || message.replace(pattern, '');
  }
  return message;
}

function validationField(loc: unknown): string | undefined {
  return Array.isArray(loc)
    ? loc.filter((part): part is string => typeof part === 'string' && !['body', 'query', 'path', 'payload'].includes(part)).pop()
    : undefined;
}

/** Field names of a 422 validation error (`detail: [{ loc, msg }]`). */
function validationFields(detail: unknown): string[] {
  if (!Array.isArray(detail)) return [];
  return detail
    .map((item) => (item && typeof item === 'object' ? validationField((item as { loc?: unknown }).loc) : undefined))
    .filter((field): field is string => !!field);
}

function validationFieldMessages(detail: unknown): Record<string, string> {
  const messages: Record<string, string> = {};
  if (!Array.isArray(detail)) return messages;
  for (const item of detail) {
    if (!item || typeof item !== 'object') continue;
    const { loc, msg } = item as { loc?: unknown; msg?: unknown };
    const field = validationField(loc);
    if (field && typeof msg === 'string') messages[field] = translateValidationMessage(msg);
  }
  return messages;
}

/** One Pydantic/ninja validation item: `{ loc: [...], msg: "..." }`. */
function formatValidationItem(item: unknown): string | null {
  if (!item || typeof item !== 'object') return typeof item === 'string' ? item : null;
  const { loc, msg } = item as { loc?: unknown; msg?: unknown };
  if (typeof msg !== 'string') return formatApiErrorBody(item as ApiErrorBody);
  const field = validationField(loc);
  const text = translateValidationMessage(msg);
  return field ? `${field}: ${text}` : text;
}

function formatApiErrorBody(body: ApiErrorBody): string | null {
  const detail = body.detail ?? body.message;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map(formatValidationItem).filter((part): part is string => !!part);
    return parts.length ? parts.join(', ') : null;
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

export const NETWORK_ERROR_MESSAGE = 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.';
export const SCHEMA_ERROR_MESSAGE = 'Die Antwort des Servers konnte nicht gelesen werden.';
export const UNKNOWN_ERROR_MESSAGE = 'Ein unerwarteter Fehler ist aufgetreten.';

export type ErrorKind = 'network' | 'schema' | 'api' | 'unknown';

/** Network failures of `fetch` (Chrome, Firefox, Safari wording). */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) return error.code === 'network';
  return (
    error instanceof TypeError &&
    /failed to fetch|networkerror|load failed|network request failed/i.test(error.message)
  );
}

/** Zod validation of an API response failed. */
export function isSchemaError(error: unknown): boolean {
  if (error instanceof ApiError) return error.code === 'schema';
  return error instanceof Error && error.name === 'ZodError';
}

export function errorKind(error: unknown): ErrorKind {
  if (isNetworkError(error)) return 'network';
  if (isSchemaError(error)) return 'schema';
  if (error instanceof ApiError) return 'api';
  return 'unknown';
}

/**
 * German, user-facing message for any caught error (food-error-presentation):
 * English system texts ("Failed to fetch", Zod issues) never reach the UI.
 */
export function getApiErrorMessage(error: unknown, fallback = UNKNOWN_ERROR_MESSAGE): string {
  switch (errorKind(error)) {
    case 'network':
      return NETWORK_ERROR_MESSAGE;
    case 'schema':
      return SCHEMA_ERROR_MESSAGE;
    case 'api':
      return (error as ApiError).message || fallback;
    default:
      // Our own code throws German messages; JavaScript runtime errors are English and never shown.
      return error instanceof Error && error.message && !SYSTEM_ERROR.test(error.message) ? error.message : fallback;
  }
}

/** English runtime/system error texts that must not reach the UI. */
const SYSTEM_ERROR = /^(unexpected token|unexpected end|json\.parse|cannot read|cannot set|undefined is not|null is not|.* is not a function|.* is not defined|the operation was aborted|aborterror|internal server error)/i;

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
      response.headers.get('X-Request-ID') ?? undefined,
    );
  }
  if (!schema) return body as T;
  try {
    return schema.parse(body);
  } catch (cause) {
    if (isSchemaError(cause)) {
      console.error('API response does not match the schema:', response.url, cause);
      throw new ApiError(response.status, response.statusText, { detail: SCHEMA_ERROR_MESSAGE, code: 'schema' });
    }
    throw cause;
  }
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
  try {
    return await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
        ...options.headers,
      },
    });
  } catch (cause) {
    if (isNetworkError(cause)) throw new ApiError(0, '', { detail: NETWORK_ERROR_MESSAGE, code: 'network' });
    throw cause;
  }
}
