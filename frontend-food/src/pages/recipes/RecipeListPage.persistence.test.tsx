// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { RecipeFilter } from '@/schemas/recipe';
import RecipeListPage from './RecipeListPage';

const mocks = vi.hoisted(() => ({
  user: { id: 1 } as { id: number } | null,
  useRecipes: vi.fn(),
}));

vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ data: mocks.user, isLoading: false }),
}));

vi.mock('@/api/recipes', () => ({
  useRecipes: (filters: Partial<RecipeFilter>, options: { enabled?: boolean }) => {
    mocks.useRecipes(filters, options);
    return { data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }, isLoading: false, error: null, refetch: vi.fn() };
  },
  useDeleteRecipe: () => ({ mutate: vi.fn(), isPending: false }),
  useForkRecipe: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/components/recipe/RecipeFilterSidebar', () => ({
  default: ({ onFilterChange }: { onFilterChange: (key: string, value: unknown) => void }) => (
    <button type="button" onClick={() => onFilterChange('origin', ['mine'])}>Meine Rezepte</button>
  ),
}));

function LocationProbe() {
  return <div data-testid="location">{useLocation().search}</div>;
}

function renderApp(path = '/recipes') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/recipes" element={<><RecipeListPage /><Link to="/recipes/eintopf">Eintopf</Link></>} />
        <Route path="/recipes/:slug" element={<Link to="/recipes">Rezepte</Link>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function lastEnabledFilters(): Partial<RecipeFilter> {
  const calls = mocks.useRecipes.mock.calls.filter(([, options]) => options.enabled);
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  mocks.user = { id: 1 };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe('RecipeListPage filter persistence', () => {
  it('keeps "Meine Rezepte" and "Neueste" when returning via the breadcrumb', async () => {
    renderApp();
    fireEvent.click(screen.getByText('Meine Rezepte'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'newest' } });
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('?origin=mine&sort=newest'));

    fireEvent.click(screen.getByText('Eintopf'));
    fireEvent.click(screen.getByText('Rezepte'));

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('?origin=mine&sort=newest'));
    expect(lastEnabledFilters()).toMatchObject({ origin: ['mine'], sort: 'newest', page: 1 });
    expect(screen.getByTestId('active-filters-hint').textContent).toContain('2 Filter aktiv');
  });

  it('does not load the defaults before the stored state was applied', async () => {
    renderApp();
    fireEvent.click(screen.getByText('Meine Rezepte'));
    cleanup();
    mocks.useRecipes.mockClear();

    renderApp();

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('?origin=mine'));
    const enabledCalls = mocks.useRecipes.mock.calls.filter(([, options]) => options.enabled);
    expect(enabledCalls.every(([filters]) => filters.origin?.[0] === 'mine')).toBe(true);
  });

  it('shows another account its own defaults', async () => {
    renderApp();
    fireEvent.click(screen.getByText('Meine Rezepte'));
    cleanup();

    mocks.user = { id: 2 };
    renderApp();

    await waitFor(() => expect(lastEnabledFilters()).toMatchObject({ origin: ['verified'], sort: 'use_count' }));
    expect(screen.getByTestId('location').textContent).toBe('');
    expect(screen.queryByTestId('active-filters-hint')).toBeNull();
  });

  it('takes over the old view key once', async () => {
    localStorage.setItem('recipe-search-view', 'table');
    renderApp();

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('?view=table'));
    expect(localStorage.getItem('recipe-search-view')).toBeNull();
  });
});
