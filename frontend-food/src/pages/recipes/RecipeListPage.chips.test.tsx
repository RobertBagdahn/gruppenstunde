// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
import RecipeListPage from './RecipeListPage';

vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ data: { id: 1 }, isLoading: false }),
}));

vi.mock('@/api/popularRecipes', () => ({
  usePopularRecipeIds: () => ({ data: new Set<number>() }),
}));

vi.mock('@/api/recipes', () => ({
  useRecipes: () => ({
    data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useDeleteRecipe: () => ({ mutate: vi.fn(), isPending: false }),
  useForkRecipe: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/components/recipe/RecipeFilterSidebar', () => ({
  default: () => null,
}));

function renderPage() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={['/recipes']}>
      <Routes>
        <Route path="/recipes" element={<RecipeListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function typeGroup() {
  return within(screen.getByRole('group', { name: 'Typ' }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('RecipeListPage type chips (food-category-colour-usage)', () => {
  it('shows every quick type as a white chip with a colour dot and no pressed state', () => {
    renderPage();
    for (const label of ['Frühstück', 'Warme Mahlzeit', 'Kalte Mahlzeit', 'Nachtisch', 'Getränk', 'Snack']) {
      const chip = typeGroup().getByRole('button', { name: label });
      expect(chip).toHaveAttribute('aria-pressed', 'false');
      expect(chip).toHaveClass('bg-card', 'border-border');
      const dot = chip.querySelector('span[aria-hidden="true"]');
      expect(dot).not.toBeNull();
      expect(dot?.className).toMatch(/bg-category-/);
    }
  });

  it('marks the selected chip with a Petrol border and text, without a filled surface', () => {
    renderPage();
    const chip = typeGroup().getByRole('button', { name: 'Frühstück' });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveClass('border-primary', 'text-primary-dark');
    expect(chip).not.toHaveClass('bg-primary');
    expect(chip).not.toHaveClass('bg-category-breakfast');
  });
});
