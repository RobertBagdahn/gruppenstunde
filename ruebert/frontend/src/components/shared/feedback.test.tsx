import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/App';
import { mockApi } from '@/test/apiMock';
import { renderWithProviders } from '@/test/render';

afterEach(() => {
  vi.unstubAllGlobals();
});

const SENT = {
  status: 'sent',
  message: 'Danke. Die Rückmeldung ist als Issue #42 angelegt.',
  issue_number: 42,
  issue_url: 'https://github.com/RobertBagdahn/seed-demand/issues/42',
};

function open(route: string, overrides: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi(overrides);
  vi.stubGlobal('fetch', vi.fn(api.fetchMock));
  renderWithProviders(<App />, { route });
  return api;
}

describe('Rückmeldung (9.2)', () => {
  it('shows the beet button with its name and three kinds in the menu', async () => {
    const user = userEvent.setup();
    open('/order-plans');
    const button = await screen.findByRole('button', { name: 'Rückmeldung geben' });
    await user.click(button);
    const menu = screen.getByRole('menu', { name: 'Art der Rückmeldung' });
    expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Frage', 'Bug', 'Feature-Wunsch']);
  });

  it('asks for a title and sends nothing without one', async () => {
    const user = userEvent.setup();
    const { calls } = open('/order-plans');
    await user.click(await screen.findByRole('button', { name: 'Rückmeldung geben' }));
    await user.click(screen.getByRole('menuitem', { name: 'Bug' }));
    await user.click(screen.getByRole('button', { name: 'Senden' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte einen Titel angeben.');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('attaches route and article as context and confirms the issue number', async () => {
    const user = userEvent.setup();
    const { calls } = open('/products/DGW001', { 'POST /api/feedback': { status: 200, body: SENT } });
    await user.click(await screen.findByRole('button', { name: 'Rückmeldung geben' }));
    await user.click(screen.getByRole('menuitem', { name: 'Bug' }));
    await user.type(screen.getByLabelText('Titel'), 'Herleitung fehlt');
    await user.click(screen.getByRole('button', { name: 'Senden' }));
    const link = await screen.findByRole('link', { name: 'Issue #42 öffnen' });
    expect(link).toHaveAttribute('href', SENT.issue_url);
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.body).toMatchObject({
      kind: 'bug',
      title: 'Herleitung fehlt',
      context: { route: '/products/DGW001', sku: 'DGW001', app_version: '0.1.0' },
    });
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    open('/order-plans');
    await user.click(await screen.findByRole('button', { name: 'Rückmeldung geben' }));
    await user.click(screen.getByRole('menuitem', { name: 'Frage' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('Präsentationsmodus und Fragen-Pins (9.3)', () => {
  it('shows no pins while presentation mode is off', async () => {
    open('/order-plans');
    await screen.findByText(/Ziel KW 39\/2027/);
    expect(screen.queryByRole('button', { name: 'Q-050' })).not.toBeInTheDocument();
  });

  it('shows the pin in presentation mode and the question text on activation', async () => {
    const user = userEvent.setup();
    open('/order-plans?praesentation=1');
    await user.click(await screen.findByRole('button', { name: 'Q-050' }));
    expect(await screen.findByText(/Bestätigst du die Rundungsregel/)).toBeInTheDocument();
  });

  it('switches presentation mode on in the sidebar', async () => {
    const user = userEvent.setup();
    open('/order-plans');
    const toggle = await screen.findByRole('switch', { name: /Präsentationsmodus/ });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    expect(await screen.findByRole('button', { name: 'Q-050' })).toBeInTheDocument();
  });

  it('opens the feedback form as question with the ID prefilled', async () => {
    const user = userEvent.setup();
    open('/order-plans?praesentation=1');
    await user.click(await screen.findByRole('button', { name: 'Q-050' }));
    await user.click(await screen.findByRole('button', { name: 'Antwort festhalten' }));
    expect(screen.getByRole('dialog', { name: 'Rückmeldung geben' })).toBeInTheDocument();
    expect(screen.getByLabelText('Titel')).toHaveValue('Q-050 ');
    expect(screen.getByRole('radio', { name: 'Frage' })).toBeChecked();
  });
});
