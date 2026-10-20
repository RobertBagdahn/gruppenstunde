import status from './fixtures/api/status.json';
import trafficLight from './fixtures/api/traffic_light.json';
import products from './fixtures/api/products.json';
import productsFilters from './fixtures/api/products_filters.json';
import productDgw001 from './fixtures/api/product_dgw001.json';
import orderPlan from './fixtures/api/order_plan.json';
import suppliers from './fixtures/api/suppliers.json';
import supplierDetail from './fixtures/api/supplier_detail.json';
import cases from './fixtures/api/cases.json';
import stockouts from './fixtures/api/stockouts.json';
import events from './fixtures/api/events.json';
import quality from './fixtures/api/quality.json';
import sets from './fixtures/api/sets.json';
import setSet001 from './fixtures/api/set_set001.json';
import runs from './fixtures/api/runs.json';
import settings from './fixtures/api/settings.json';
import question050 from './fixtures/api/question_q050.json';
import wikiTree from './fixtures/api/wiki_tree.json';
import wikiPages from './fixtures/api/wiki_pages.json';

/** Answers from the real backend on the test world (see fixtures/api). Unknown paths answer 404 like the API. */
export const FIXTURES: Record<string, unknown> = {
  '/api/status': status,
  '/api/traffic-light': trafficLight,
  '/api/products': products,
  '/api/products/filters': productsFilters,
  '/api/products/DGW001': productDgw001,
  '/api/order-plans': orderPlan,
  '/api/supplier-orders': suppliers,
  [`/api/supplier-orders/${supplierDetail.supplier_id}`]: supplierDetail,
  '/api/cases': cases,
  '/api/stockouts': stockouts,
  '/api/events': events,
  '/api/forecast-quality': quality,
  '/api/sets': sets,
  '/api/sets/SET001': setSet001,
  '/api/runs': runs,
  '/api/settings': settings,
  '/api/questions/Q-050': question050,
  '/api/wiki': wikiTree,
};

export type Call = { url: string; method: string; body: unknown };

/**
 * Fetch mock for the whole app. `overrides` answers specific method + path pairs (e.g. a 422 on PUT);
 * every call is recorded so tests can check what was sent.
 */
export function mockApi(overrides: Record<string, { status: number; body: unknown }> = {}) {
  const calls: Call[] = [];
  const fetchMock = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: url.pathname + url.search, method, body });
    const override = overrides[`${method} ${url.pathname}`];
    if (override) return json(override.body, override.status);
    if (method !== 'GET') return json({ detail: 'Nicht gefunden.' }, 404);
    if (url.pathname === '/api/wiki/page') {
      const page = (wikiPages as Record<string, unknown>)[url.searchParams.get('path') ?? ''];
      return page ? json(page, 200) : json({ detail: 'Seite nicht gefunden.' }, 404);
    }
    if (url.pathname in FIXTURES) return json(FIXTURES[url.pathname], 200);
    return json({ detail: 'Nicht gefunden.' }, 404);
  };
  return { fetchMock, calls };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
