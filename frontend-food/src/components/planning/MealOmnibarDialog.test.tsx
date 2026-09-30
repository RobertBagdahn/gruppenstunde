import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealOmnibarDialog } from './MealOmnibarDialog';

const searchData = vi.hoisted(() => ({
  current: { recipes: [] as unknown[], ingredients: [] as unknown[] },
}));

vi.mock('@/api/mealPlans', () => ({
  useRecipeSearch: () => ({ data: searchData.current, isLoading: false }),
}));

const baseRecipe = {
  id: 101,
  title: 'Spaghetti Bolognese',
  slug: 'spaghetti-bolognese',
  recipe_type: 'warm_meal',
  recipe_badge: 'verified',
  price_per_serving: 2.1,
  usage_count: 12,
};
const baseIngredient = { id: 201, name: 'Haferflocken', slug: 'haferflocken', portions: [] };

beforeEach(() => {
  searchData.current = { recipes: [baseRecipe], ingredients: [baseIngredient] };
});

describe('MealOmnibarDialog', () => {
  it('renders omnibar input and filter pills', () => {
    render(
      <MealOmnibarDialog
        open={true}
        onOpenChange={() => {}}
        onSelectRecipe={() => {}}
      />
    );

    expect(screen.getByPlaceholderText(/Gericht oder Zutat suchen/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Rezepte/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Zutaten/i })).toBeDefined();
  });

  it('selects recipe and triggers callback on button click', () => {
    const handleSelectRecipe = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <MealOmnibarDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSelectRecipe={handleSelectRecipe}
        normPortions={25}
      />
    );

    // Click recipe in list
    const recipeItem = screen.getAllByText('Spaghetti Bolognese')[0];
    fireEvent.click(recipeItem);

    expect(handleSelectRecipe).toHaveBeenCalledWith(101, 'Spaghetti Bolognese');
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('filters by category pill', () => {
    render(
      <MealOmnibarDialog
        open={true}
        onOpenChange={() => {}}
        onSelectRecipe={() => {}}
      />
    );

    // Click on "Zutaten"
    const ingredientsPill = screen.getByRole('button', { name: /Zutaten/i });
    fireEvent.click(ingredientsPill);

    expect(screen.getAllByText('Haferflocken').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Spaghetti Bolognese')).toBeNull();
  });

  it('names the target meal in the header', () => {
    render(
      <MealOmnibarDialog
        open={true}
        onOpenChange={() => {}}
        onSelectRecipe={() => {}}
        targetLabel="Abendessen · Fr., 11.12."
      />
    );

    expect(screen.getByText('Abendessen · Fr., 11.12.')).toBeDefined();
    expect(screen.getByText(/Hinzufügen zu:/)).toBeDefined();
  });

  it('offers no placeholder sets or bundles', () => {
    render(
      <MealOmnibarDialog
        open={true}
        onOpenChange={() => {}}
        onSelectRecipe={() => {}}
        mealType="breakfast"
      />
    );

    expect(screen.queryByText(/Set\)/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Sets/i })).toBeNull();
  });

  it('groups "Alle" into five recipes and five ingredients', () => {
    searchData.current = {
      recipes: Array.from({ length: 25 }, (_, n) => ({ ...baseRecipe, id: 1000 + n, title: `Rezept ${n}` })),
      ingredients: Array.from({ length: 25 }, (_, n) => ({ ...baseIngredient, id: 2000 + n, name: `Zutat ${n}` })),
    };
    render(
      <MealOmnibarDialog
        open={true}
        onOpenChange={() => {}}
        onSelectRecipe={() => {}}
      />
    );

    expect(screen.getAllByText(/^Rezept \d+$/)).toHaveLength(5 + 1); // list + preview title
    expect(screen.getAllByText(/^Zutat \d+$/)).toHaveLength(5);
    expect(screen.getByRole('button', { name: /Alle 25 Rezepte anzeigen/ })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Alle 25 Zutaten anzeigen/ }));

    expect(screen.getAllByText(/^Zutat \d+$/).length).toBeGreaterThanOrEqual(25);
    expect(screen.queryByText(/^Rezept \d+$/)).toBeNull();
  });

  it('does not listen to Cmd+K itself (the page owns the shortcut)', () => {
    const handleOpenChange = vi.fn();
    render(
      <MealOmnibarDialog
        open={false}
        onOpenChange={handleOpenChange}
        onSelectRecipe={() => {}}
      />
    );

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(handleOpenChange).not.toHaveBeenCalled();
  });
});
