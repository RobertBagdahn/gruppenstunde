import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/App';
import { FIXTURES, mockApi } from '@/test/apiMock';
import { renderWithProviders } from '@/test/render';

afterEach(() => {
  vi.unstubAllGlobals();
});

function open(route: string, overrides: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi(overrides);
  vi.stubGlobal('fetch', vi.fn(api.fetchMock));
  renderWithProviders(<App />, { route });
  return api;
}

describe('Entscheidungen (8.1)', () => {
  it('shows the counts, the queue and the selected suggestion with its chart and derivation', async () => {
    open('/');
    const first = (FIXTURES['/api/traffic-light'] as { queue: { title: string }[] }).queue[0].title;
    expect(await screen.findByRole('heading', { name: first })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Offene Entscheidungen' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Absatz, Prognose und 80-%-Bereich/ })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Herleitung' })).toBeInTheDocument();
  });

  it('accepts the suggestion through the journal endpoint', async () => {
    const user = userEvent.setup();
    const { calls } = open('/');
    await user.click(await screen.findByRole('button', { name: /Übernehmen/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/decision'))).toBe(true));
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.url).toMatch(/^\/api\/traffic-light\/[A-Z0-9]+\/decision$/);
    expect(post?.body).toEqual({ choice: 'annehmen' });
  });

  it('lists special articles separately', async () => {
    open('/');
    expect(await screen.findByRole('region', { name: 'Sonderartikel' })).toBeInTheDocument();
  });
});

describe('Artikel (8.2)', () => {
  it('lists articles with name and SKU linked to their detail page', async () => {
    open('/products');
    const link = await screen.findByRole('link', { name: /DGW001/ });
    expect(link).toHaveAttribute('href', '/products/DGW001');
  });

  it('shows the detail with the chart, origin, models and the sentence of the suggestion', async () => {
    open('/products/DGW001');
    expect(await screen.findByRole('heading', { name: /Artikel|DGW001|Basilikum|Schnittlauch|Radieschen|Kürbis|Gurke|Tomate/ })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /DGW001/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Herkunft des Bedarfs' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Modelle' })).toBeInTheDocument();
  });
});

describe('Bestellplaner (8.3)', () => {
  it('shows the target week, the total against the tranche and a stepper per row', async () => {
    open('/order-plans');
    expect(await screen.findByText('Ziel KW 39/2027')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Bestellpositionen/ })).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /^Menge / }).length).toBeGreaterThan(0);
  });

  it('sends a quantity change to the planner endpoint, never a free value', async () => {
    const user = userEvent.setup();
    const { calls } = open('/order-plans');
    const [first] = await screen.findAllByRole('button', { name: /Menge .* erhöhen/ });
    await user.click(first);
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.url).toMatch(/^\/api\/order-plans\/quantities\/[A-Z0-9]+$/);
    expect((put?.body as { quantity: number }).quantity % 5000).toBe(0);
  });

  it('asks before approving and only then posts the approval', async () => {
    const user = userEvent.setup();
    const { calls } = open('/order-plans');
    await user.click(await screen.findByRole('button', { name: /Freigeben …/ }));
    expect(screen.getByRole('dialog', { name: 'Freigabe bestätigen' })).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Freigeben' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/order-plans/approve')).toBe(true));
  });
});

describe('Fremdmarke (8.4)', () => {
  it('marks the whole page as sample data and shows the suppliers', async () => {
    open('/supplier-orders');
    expect(await screen.findByRole('note')).toHaveTextContent('Beispieldaten.');
    expect((await screen.findAllByRole('link', { name: /Beispiel-Lieferant/ })).length).toBeGreaterThan(0);
  });

  it('drills down to the articles of one supplier', async () => {
    open('/supplier-orders/BSP-L1');
    expect(await screen.findByRole('heading', { name: /Beispiel-Lieferant/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Artikel des Lieferanten' })).toBeInTheDocument();
  });
});

describe('Fall-Inbox, OOS-Monitor, Ereignisse (8.5)', () => {
  it('shows the case inbox with its status segment', async () => {
    open('/data/cases');
    expect(await screen.findByRole('region', { name: 'Fälle' })).toBeInTheDocument();
  });

  it('shows stock-out phases as hypotheses, with the question pin in presentation mode', async () => {
    open('/data/stockouts');
    expect(await screen.findByText(/Ausverkaufsphasen aus den Buchungen sind Hypothesen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Q-101' })).not.toBeInTheDocument();
  });

  it('marks example events and offers the form for new ones', async () => {
    open('/data/events');
    expect(await screen.findByText('Ostern')).toBeInTheDocument();
    expect(screen.getAllByText('Beispiel').length).toBeGreaterThan(0);
    expect(screen.getByRole('form', { name: 'Ereignis hinzufügen' })).toBeInTheDocument();
  });
});

describe('Prognosegüte, Sets, Daten & Läufe (8.6)', () => {
  it('shows model quality and the worst articles', async () => {
    open('/forecast-quality');
    expect(await screen.findByRole('table', { name: 'Modelle' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Schlechteste Artikel' })).toBeInTheDocument();
  });

  it('lists sets and links their components on the detail page', async () => {
    open('/sets/SET001');
    const table = await screen.findByRole('table', { name: 'Komponenten' });
    expect(within(table).getByRole('link', { name: /DGW001/ })).toHaveAttribute('href', '/products/DGW001');
  });

  it('shows runs, checksum and the time machine notice', async () => {
    open('/data/quality');
    expect(await screen.findByText(/Der Stichtag ist 2026-05-18/)).toBeInTheDocument();
    expect(screen.getAllByText(/#25/).length).toBeGreaterThan(0);
    expect(screen.getByText('Prüfsumme')).toBeInTheDocument();
  });
});

describe('Einstellungen (8.7)', () => {
  it('shows each parameter with its status and links open questions', async () => {
    open('/settings');
    expect(await screen.findByText('Lieferzeit')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'offen Q-080' });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', '/wiki?frage=Q-080');
    expect(screen.getAllByText('bestätigt').length).toBeGreaterThan(0);
  });

  it('shows the German field error when the API rejects the value', async () => {
    const user = userEvent.setup();
    open('/settings', {
      'PUT /api/settings/rounding_threshold_percent': {
        status: 422,
        body: {
          detail: 'Eingabe ungültig.',
          errors: [{ field: 'value', message: 'Rundungsschwelle: Der Wert muss zwischen 1 und 100 % liegen.' }],
        },
      },
    });
    const input = await screen.findByLabelText('Rundungsschwelle');
    await user.clear(input);
    await user.type(input, '120');
    await user.click(within(input.closest('form') as HTMLElement).getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('zwischen 1 und 100 %');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('saves a valid value into the journal endpoint', async () => {
    const { calls } = open('/settings');
    const input = await screen.findByLabelText('Lieferzeit');
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.url === '/api/settings/lead_time_weeks')).toBe(true));
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ value: 10 });
  });
});
