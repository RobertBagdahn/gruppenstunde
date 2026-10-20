import type { z } from 'zod';

/** One field error from a 422 response, with a German message for the field. */
export type FieldError = { field: string; message: string };

/** Error of an API call with a German message that can be shown to the user as is. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 when the server could not be reached. */
    readonly status: number,
    /** Field errors of a 422 response; empty for every other error. */
    readonly fields: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Schema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

/** GET a JSON endpoint and validate the response against a Zod schema. */
export async function apiGet<T>(path: string, schema: Schema<T>, signal?: AbortSignal): Promise<T> {
  return request('GET', path, undefined, schema, signal);
}

/** PUT/POST/DELETE a JSON endpoint; the answer is validated like a GET. */
export async function apiSend<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, schema: Schema<T>, body?: unknown): Promise<T> {
  return request(method, path, body, schema);
}

async function request<T>(method: string, path: string, body: unknown, schema: Schema<T>, signal?: AbortSignal): Promise<T> {
  let response: Response;
  const init: RequestInit = {
    method,
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    signal,
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  try {
    response = await fetch(path, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Server nicht erreichbar.', 0);
  }

  if (!response.ok) {
    const { message, fields } = await errorBody(response);
    throw new ApiError(message, response.status, fields);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new ApiError('Antwort des Servers ist kein gültiges JSON.', response.status);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ApiError('Antwort des Servers hat ein unerwartetes Format.', response.status);
  }
  return result.data;
}

async function errorBody(response: Response): Promise<{ message: string; fields: FieldError[] }> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      const detail = 'detail' in body && typeof body.detail === 'string' ? body.detail : null;
      const fields = 'errors' in body && Array.isArray(body.errors) ? body.errors.flatMap(toFieldError) : [];
      if (detail) return { message: detail, fields };
    }
  } catch {
    // Body is not JSON; fall back to the status line.
  }
  return { message: `Anfrage fehlgeschlagen (HTTP ${response.status}).`, fields: [] };
}

function toFieldError(value: unknown): FieldError[] {
  if (value && typeof value === 'object' && 'field' in value && 'message' in value) {
    const { field, message } = value as { field: unknown; message: unknown };
    if (typeof field === 'string' && typeof message === 'string') return [{ field, message }];
  }
  return [];
}
