import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { Page, Route } from '@playwright/test';

// The same real backend answers the browser tests as the Vitest mock (src/test/fixtures/api).
const FIXTURE_DIR = fileURLToPath(new URL('../src/test/fixtures/api/', import.meta.url));
const FILES: Record<string, string> = {
  '/api/status': 'status.json',
  '/api/traffic-light': 'traffic_light.json',
  '/api/products': 'products.json',
  '/api/products/filters': 'products_filters.json',
  '/api/products/DGW001': 'product_dgw001.json',
  '/api/order-plans': 'order_plan.json',
  '/api/supplier-orders': 'suppliers.json',
  '/api/supplier-orders/BSP-L1': 'supplier_detail.json',
  '/api/cases': 'cases.json',
  '/api/stockouts': 'stockouts.json',
  '/api/events': 'events.json',
  '/api/forecast-quality': 'quality.json',
  '/api/sets': 'sets.json',
  '/api/sets/SET001': 'set_set001.json',
  '/api/runs': 'runs.json',
  '/api/settings': 'settings.json',
  '/api/questions/Q-050': 'question_q050.json',
};

export type Recorded = { method: string; path: string; body: unknown };

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(`${FIXTURE_DIR}${name}`, 'utf8'));
}

/**
 * Serves `/api/*` from the fixtures and records every call. `overrides` answers `METHOD /path` pairs
 * (e.g. `GET /api/cases`) with another body; writes need such an answer, anything else unknown answers 404.
 */
export async function routeApi(page: Page, overrides: Record<string, unknown> = {}): Promise<Recorded[]> {
  const calls: Recorded[] = [];
  // Only backend paths: Vite serves source files under /src/api/… as well.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    // Paths arrive percent-encoded (ids contain ":"); match on the decoded path.
    const pathname = decodeURIComponent(url.pathname);
    const method = request.method();
    const body = request.postData() ? JSON.parse(request.postData() as string) : undefined;
    calls.push({ method, path: pathname + url.search, body });
    const key = `${method} ${pathname}`;
    if (key in overrides) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overrides[key]) });
    if (method === 'GET' && pathname in FILES) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(FILES[pathname])) });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Nicht gefunden.' }) });
  });
  return calls;
}
