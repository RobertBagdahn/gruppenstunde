import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/App';
import { mockApi } from '@/test/apiMock';
import { renderWithProviders } from '@/test/render';

afterEach(() => {
  vi.unstubAllGlobals();
});

function open(route: string) {
  const api = mockApi();
  vi.stubGlobal('fetch', vi.fn(api.fetchMock));
  renderWithProviders(<App />, { route });
  return api;
}

describe('Wissen (10.2)', () => {
  it('renders a page with its frontmatter header and the draft badge', async () => {
    open('/wiki/open-questions/q-050-rundungsregel.md');
    expect((await screen.findAllByRole('heading', { name: /Q-050/ })).length).toBeGreaterThan(0);
    expect(screen.getByText('Arbeitsstand')).toBeInTheDocument();
  });

  it('opens the question page from "frage" in the URL, as the settings links do', async () => {
    const { calls } = open('/wiki?frage=Q-080');
    expect((await screen.findAllByRole('heading', { name: /Q-080/ })).length).toBeGreaterThan(0);
    expect(calls.some((c) => c.url.includes('path=open-questions%2Fq-080'))).toBe(true);
  });

  it('lists matching pages when the sidebar search is used', async () => {
    const user = userEvent.setup();
    open('/wiki/open-questions/q-080-ampel-schwellen.md');
    await user.type(await screen.findByRole('searchbox', { name: 'Wissen durchsuchen' }), 'rundung');
    expect(screen.getByRole('link', { name: /Q-050/ })).toHaveAttribute('href', '/wiki/open-questions/q-050-rundungsregel.md');
  });

  it('offers no edit controls', async () => {
    open('/wiki/open-questions/q-050-rundungsregel.md');
    await screen.findAllByRole('heading', { name: /Q-050/ });
    expect(screen.queryByRole('button', { name: /bearbeiten|speichern/i })).not.toBeInTheDocument();
  });

  it('shows a German message for a page that does not exist', async () => {
    open('/wiki/gibt-es-nicht.md');
    expect(await screen.findByRole('alert')).toHaveTextContent('Seite nicht gefunden.');
  });
});
