// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
import MyRecipesPage from './MyRecipesPage';

const mockState = vi.hoisted(() => ({
  data: undefined as unknown,
}));

vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ data: { id: 1 }, isLoading: false }),
}));

vi.mock('@/api/recipes', () => ({
  useMyRecipes: () => ({ data: mockState.data, isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/components/recipe/RecipeCard', () => ({
  default: ({ recipe }: { recipe: { title: string } }) => <article>{recipe.title}</article>,
}));

vi.mock('@/components/recipe/RecipeBadge', () => ({
  default: () => null,
}));

function item(id: number) {
  return { id, slug: `rezept-${id}`, title: `Rezept ${id}`, recipe_badge: 'community' };
}

function renderPage(path: string) {
  return render(
    <MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={[path]}>
      <Routes>
        <Route path="/recipes/my-recipes" element={<MyRecipesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  mockState.data = undefined;
});

describe('MyRecipesPage (food-canvas-layout)', () => {
  it('shows the empty state with a link back to all recipes', () => {
    mockState.data = { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 };
    renderPage('/recipes/my-recipes');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Meine Rezepte');
    expect(screen.getByRole('heading', { name: 'Noch keine persönlichen Rezepte' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rezepte durchstöbern' })).toHaveAttribute('href', '/recipes');
  });

  it('shows the count pill and the cards of the current page', () => {
    mockState.data = { items: [item(1), item(2)], total: 25, page: 1, page_size: 20, total_pages: 2 };
    renderPage('/recipes/my-recipes');
    expect(screen.getByText('25 persönliche Rezepte')).toBeInTheDocument();
    expect(screen.getByText('Rezept 1')).toBeInTheDocument();
    expect(screen.getByText('Rezept 2')).toBeInTheDocument();
  });

  it('keeps pagination in the URL and marks the current page', () => {
    mockState.data = { items: [item(1)], total: 25, page: 1, page_size: 20, total_pages: 2 };
    renderPage('/recipes/my-recipes?page=1');
    const nav = screen.getByRole('navigation', { name: 'Seiten' });
    expect(within(nav).getByRole('link', { name: 'Seite 1' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Nächste Seite' })).toHaveAttribute(
      'href',
      '/recipes/my-recipes?page=2',
    );
  });

  it('hides pagination when everything fits on one page', () => {
    mockState.data = { items: [item(1)], total: 1, page: 1, page_size: 20, total_pages: 1 };
    renderPage('/recipes/my-recipes');
    expect(screen.queryByRole('navigation', { name: 'Seiten' })).toBeNull();
  });
});
