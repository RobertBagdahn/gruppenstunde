// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { RecipeListStateSchema, IngredientListStateSchema } from '@/schemas/listState';
import { listStateStorageKey, writeListState } from '@/lib/listStateStorage';
import { usePersistedListState } from './usePersistedListState';

const auth = vi.hoisted(() => ({ user: null as { id: number } | null, isLoading: false }));

vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ data: auth.user, isLoading: auth.isLoading }),
}));

const RECIPE_DEFAULTS = { origin: ['verified'], sort: 'use_count' as const, view: 'grid' as const, page: 1 };
const PAGE_ONLY = ['page'] as const;
const COUNT_EXCLUDE = ['page', 'view'] as const;

function RecipeList() {
  const { state, patch, reset, activeCount, restored } = usePersistedListState({
    key: 'recipes',
    schema: RecipeListStateSchema,
    defaults: RECIPE_DEFAULTS,
    persistExclude: PAGE_ONLY,
    countExclude: COUNT_EXCLUDE,
  });
  const location = useLocation();
  return (
    <div>
      <div data-testid="search">{location.search}</div>
      <div data-testid="restored">{String(restored)}</div>
      <div data-testid="count">{activeCount}</div>
      <div data-testid="sort">{state.sort}</div>
      <div data-testid="origin">{state.origin.join(',')}</div>
      <div data-testid="page">{state.page}</div>
      <button type="button" onClick={() => patch({ origin: ['mine'], sort: 'newest', page: undefined })}>
        Meine Neueste
      </button>
      <button type="button" onClick={() => patch({ page: 4 })}>Seite 4</button>
      <button type="button" onClick={reset}>Zurücksetzen</button>
      <Link to="/recipes/eintopf">Rezept öffnen</Link>
    </div>
  );
}

function IngredientList() {
  const { state } = usePersistedListState({
    key: 'ingredients',
    schema: IngredientListStateSchema,
    defaults: { sort: 'relevance', page: 1 } as const,
  });
  return <div data-testid="status">{state.status ?? 'alle'}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/recipes" element={<RecipeList />} />
        <Route path="/ingredients" element={<IngredientList />} />
        <Route path="/recipes/:slug" element={<Link to="/recipes">Rezepte</Link>} />
      </Routes>
    </MemoryRouter>,
  );
}

function stored(userId: number | null) {
  const raw = localStorage.getItem(listStateStorageKey(userId, 'recipes'));
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  auth.user = { id: 1 };
  auth.isLoading = false;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('usePersistedListState', () => {
  it('lets the URL win over the stored state and stores it', async () => {
    writeListState(1, 'recipes', { origin: ['mine'], sort: 'newest' });
    renderAt('/recipes?recipe_type=breakfast');

    expect(screen.getByTestId('sort').textContent).toBe('use_count');
    await waitFor(() => expect(stored(1)).toEqual({ recipe_type: ['breakfast'] }));
  });

  it('restores the stored state for an empty URL, starting on page 1', async () => {
    renderAt('/recipes');
    fireEvent.click(screen.getByText('Meine Neueste'));
    fireEvent.click(screen.getByText('Seite 4'));
    expect(stored(1)).toEqual({ origin: ['mine'], sort: 'newest' });

    fireEvent.click(screen.getByText('Rezept öffnen'));
    fireEvent.click(screen.getByText('Rezepte'));

    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe('?origin=mine&sort=newest'));
    expect(screen.getByTestId('page').textContent).toBe('1');
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('waits for the current user before restoring', async () => {
    auth.isLoading = true;
    writeListState(null, 'recipes', { sort: 'oldest' });
    writeListState(1, 'recipes', { sort: 'newest' });
    const view = renderAt('/recipes');
    expect(screen.getByTestId('restored').textContent).toBe('false');
    expect(screen.getByTestId('sort').textContent).toBe('use_count');

    auth.isLoading = false;
    view.rerender(
      <MemoryRouter initialEntries={['/recipes']}>
        <Routes>
          <Route path="/recipes" element={<RecipeList />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('sort').textContent).toBe('newest'));
    expect(screen.getByTestId('restored').textContent).toBe('true');
  });

  it('does not wait for the user when the URL already carries the list state', () => {
    auth.isLoading = true;
    writeListState(1, 'recipes', { sort: 'newest' });
    renderAt('/recipes?page=2');
    expect(screen.getByTestId('restored').textContent).toBe('true');
    expect(screen.getByTestId('page').textContent).toBe('2');
  });

  it('does not wait for the user when nothing is stored for the list', () => {
    auth.isLoading = true;
    renderAt('/recipes');
    expect(screen.getByTestId('restored').textContent).toBe('true');
  });

  it('drops invalid stored fields and keeps valid ones', async () => {
    writeListState(1, 'recipes', { sort: 'rating', origin: ['mine'] });
    renderAt('/recipes');

    await waitFor(() => expect(screen.getByTestId('origin').textContent).toBe('mine'));
    expect(screen.getByTestId('sort').textContent).toBe('use_count');
  });

  it('drops the removed ingredient status "published"', async () => {
    localStorage.setItem(listStateStorageKey(1, 'ingredients'), JSON.stringify({ status: 'published' }));
    renderAt('/ingredients');

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('alle'));
  });

  it('clears the stored state on reset', async () => {
    renderAt('/recipes');
    fireEvent.click(screen.getByText('Meine Neueste'));
    fireEvent.click(screen.getByText('Zurücksetzen'));

    expect(stored(1)).toBeNull();
    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''));
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('never gives one account the state of another', async () => {
    renderAt('/recipes');
    fireEvent.click(screen.getByText('Meine Neueste'));
    cleanup();

    auth.user = { id: 2 };
    renderAt('/recipes');

    await act(async () => {});
    expect(screen.getByTestId('origin').textContent).toBe('verified');
    expect(screen.getByTestId('search').textContent).toBe('');
    expect(stored(2)).toBeNull();
    expect(stored(1)).toEqual({ origin: ['mine'], sort: 'newest' });
  });
});
