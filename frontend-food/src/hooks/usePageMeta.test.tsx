import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_TITLE } from '@/lib/seo/applyPageMeta';
import { PageMetaProvider, usePageMeta } from './usePageMeta';

function Page({ title, description }: { title?: string; description?: string }) {
  usePageMeta({ title, description });
  return <h1>Seite</h1>;
}

function renderAt(path: string, ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PageMetaProvider>{ui}</PageMetaProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('usePageMeta', () => {
  it('sets the route default when the page has no title of its own', () => {
    renderAt('/meal-plans/app', <Page />);
    expect(document.title).toBe('Essenspläne | Inspi Food');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow');
  });

  it('replaces the default with the page title and restores it on unmount', () => {
    const { unmount } = renderAt('/recipes/chili', <Page title="Chili sin Carne" description="Kräftiges Chili." />);
    expect(document.title).toBe('Chili sin Carne | Inspi Food');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Kräftiges Chili.');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();

    act(() => unmount());
    renderAt('/', <Page />);
    expect(document.title).toBe(DEFAULT_TITLE);
  });

  it('updates the title when the data of the page changes', () => {
    const { rerender } = renderAt('/recipes/chili', <Page title="Laden …" />);
    expect(document.title).toBe('Laden … | Inspi Food');
    rerender(
      <MemoryRouter initialEntries={['/recipes/chili']}>
        <PageMetaProvider>
          <Page title="Chili sin Carne" />
        </PageMetaProvider>
      </MemoryRouter>,
    );
    expect(document.title).toBe('Chili sin Carne | Inspi Food');
  });
});
