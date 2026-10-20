import type { StatusDto } from '@/schemas/status';

/** Status response as the backend will deliver it for the demo reference date 18.05.2026. */
export const STATUS_FIXTURE: StatusDto = {
  reference_date: '2026-05-18',
  iso_week: 21,
  stages: [
    { key: 'source', label: 'Altdaten', finished_at: '2026-05-16T10:59:33Z', status: 'ok' },
    { key: 'import', label: 'Import · 1 Hinweis', finished_at: '2026-05-21T05:38:00Z', status: 'warn' },
    { key: 'forecast', label: 'Forecast #25', finished_at: '2026-05-21T05:41:01Z', status: 'ok' },
    { key: 'traffic_light', label: 'Ampel', finished_at: '2026-05-21T05:42:00Z', status: 'ok' },
  ],
  badges: { openDecisions: 23, activeProducts: 174, openCases: 7 },
  user: { name: 'Daniel', role: 'Einkauf' },
};

/** Mocks `fetch` for `/api/status`; other paths answer 404. */
export function mockStatusFetch(response: { status?: number; body?: unknown } = {}) {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.endsWith('/api/status')) return new Response(JSON.stringify({ detail: 'Nicht gefunden.' }), { status: 404 });
    return new Response(JSON.stringify(response.body ?? STATUS_FIXTURE), {
      status: response.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
