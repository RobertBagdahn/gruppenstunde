import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

import { NAVIGATION } from '@/components/layout/navigation';
import { mockStatusFetch } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

import { App } from './App';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App shell wired to /api/status', () => {
  it('fills week, date, pipeline, counters and user from the status endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn(mockStatusFetch()));
    renderWithProviders(<App />, { route: '/' });

    expect(await screen.findByText('KW 21')).toBeInTheDocument();
    expect(screen.getByText('MO 18.05.2026')).toBeInTheDocument();
    const pipeline = screen.getByRole('list', { name: 'Datenfluss' });
    expect(within(pipeline).getByText('Import · 1 Hinweis')).toBeInTheDocument();
    expect(within(pipeline).getByRole('img', { name: 'Hinweis' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Entscheidungen/ })).toHaveTextContent('23');
    expect(screen.getByText('Daniel')).toBeInTheDocument();
  });

  it('shows a red stage when the status endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn(mockStatusFetch({ status: 503, body: { detail: 'Neuaufbau läuft.' } })));
    renderWithProviders(<App />, { route: '/' });

    expect(await screen.findByText('Status nicht erreichbar')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Fehler' })).toBeInTheDocument();
    expect(screen.getByText('Gast')).toBeInTheDocument();
  });

  it('shows a red stage when the status response has the wrong shape', async () => {
    vi.stubGlobal('fetch', vi.fn(mockStatusFetch({ body: { stages: 'kaputt' } })));
    renderWithProviders(<App />, { route: '/' });
    expect(await screen.findByText('Status nicht erreichbar')).toBeInTheDocument();
  });
});

describe('routes', () => {
  it.each(NAVIGATION.flatMap((group) => group.items.map((item) => [item.to, group.label, item.label])))(
    '%s renders inside the shell with breadcrumb %s › %s',
    async (to, area, label) => {
      vi.stubGlobal('fetch', vi.fn(mockStatusFetch()));
      renderWithProviders(<App />, { route: to });
      const crumbs = screen.getByRole('navigation', { name: 'Brotkrumen' });
      expect(within(crumbs).getByText(area)).toBeInTheDocument();
      expect(within(crumbs).getByText(label)).toHaveAttribute('aria-current', 'page');
      // Some labels occur twice (the Hilfe entry and the user's icon link); the navigation entry is the active one.
      const links = screen.getAllByRole('link', { name: new RegExp(label) });
      expect(links.some((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
      expect(document.title).toBe(`${label} · Rübert`);
    },
  );

  it('renders the styleguide with tokens, type scale and sidebar building blocks', () => {
    vi.stubGlobal('fetch', vi.fn(mockStatusFetch()));
    renderWithProviders(<App />, { route: '/styleguide' });
    expect(screen.getByRole('heading', { name: 'Styleguide Layout D' })).toBeInTheDocument();
    for (const section of ['Farb-Tokens', 'Typografie', 'Radien', 'Datenfluss in der Kopfzeile']) {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument();
    }
    const filters = screen.getByRole('region', { name: 'Filter' });
    expect(within(filters).getByRole('radiogroup', { name: 'Queue-Typ' })).toBeInTheDocument();
    expect(within(filters).getByRole('radiogroup', { name: 'Marke' })).toBeInTheDocument();
    expect(within(filters).getByRole('group', { name: 'Drehklasse' })).toBeInTheDocument();
    expect(within(filters).getByRole('combobox', { name: 'Kategorie' })).toBeInTheDocument();
  });

  it('renders a not-found page for unknown routes', () => {
    vi.stubGlobal('fetch', vi.fn(mockStatusFetch()));
    renderWithProviders(<App />, { route: '/gibt-es-nicht' });
    expect(screen.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument();
  });
});
