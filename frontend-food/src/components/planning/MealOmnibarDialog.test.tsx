import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealOmnibarDialog } from './MealOmnibarDialog';

vi.mock('@/api/mealPlans', () => ({
  useRecipeSearch: () => ({
    data: {
      recipes: [
        {
          id: 101,
          title: 'Spaghetti Bolognese',
          slug: 'spaghetti-bolognese',
          recipe_type: 'warm_meal',
          recipe_badge: 'verified',
          price_per_serving: 2.1,
          usage_count: 12,
        },
      ],
      ingredients: [
        {
          id: 201,
          name: 'Haferflocken',
          slug: 'haferflocken',
          portions: [],
        },
      ],
    },
    isLoading: false,
  }),
}));

describe('MealOmnibarDialog', () => {
  it('renders omnibar input and filter pills', () => {
    render(
      <MealOmnibarDialog
        open={true}
        onOpenChange={() => {}}
        onSelectRecipe={() => {}}
      />
    );

    expect(screen.getByPlaceholderText(/Gericht, Zutat oder Set suchen/i)).toBeDefined();
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
});
