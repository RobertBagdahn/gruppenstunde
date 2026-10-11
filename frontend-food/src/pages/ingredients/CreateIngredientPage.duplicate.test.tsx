// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateIngredientPage from './CreateIngredientPage';

vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ data: { id: 1 }, isLoading: false }) }));
// Real `useCreateIngredient` (and its fetch helper), so the 409 body travels through the API layer.
vi.mock('@/api/supplies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/supplies')>()),
  useRetailSections: () => ({ data: [] }),
  useGenericTerms: () => ({ data: [] }),
}));
vi.mock('@/hooks/useRequireLogin', () => ({ useRequireLogin: () => ({ guard: (action: () => void) => action() }) }));
vi.mock('@/hooks/useAiAccess', () => ({ useAiAccess: () => ({ disabled: false, hint: '' }) }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={['/ingredients/new?prefillName=Antipasti Zwiebeln']}>
        <CreateIngredientPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CreateIngredientPage duplicate from the API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('shows the link to the existing ingredient for a 409 ingredient_exists response', async () => {
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({
        detail: 'Die Zutat „Antipasti Zwiebeln“ gibt es schon.',
        code: 'ingredient_exists',
        existing: { id: 7, slug: 'antipasti-zwiebeln', name: 'Antipasti Zwiebeln' },
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Vorschau' }));
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));

    const link = await screen.findByRole('link', { name: /Zur vorhandenen Zutat „Antipasti Zwiebeln“/ });
    expect(link.getAttribute('href')).toBe('/ingredients/antipasti-zwiebeln');
    expect(screen.getByRole('alert').textContent).toContain('Die Zutat „Antipasti Zwiebeln“ gibt es schon.');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('POST');
  });
});
