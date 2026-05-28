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
