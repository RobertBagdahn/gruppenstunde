import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MealOmnibarDialog } from './MealOmnibarDialog';

const searchData = vi.hoisted(() => ({
  current: { recipes: [] as unknown[], ingredients: [] as unknown[] },
}));

const previewData = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('@/api/mealPlans', () => ({
  useRecipeSearch: () => ({ data: searchData.current, isLoading: false }),
  useRecipePreview: () => ({ data: previewData.current, isLoading: false }),
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
  previewData.current = undefined;
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

  it('selects a result by touch and adds it from the reachable preview action', () => {
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

    // Touch selects the row so the preview and its explicit action are available.
    const recipeItem = screen.getAllByText('Spaghetti Bolognese')[0];
    fireEvent.click(recipeItem);

    expect(handleSelectRecipe).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Vorschau:/).length).toBeGreaterThan(0);
    const addButtons = screen.getAllByRole('button', { name: /Gericht hinzufügen \(25 P\.\)/ });
    fireEvent.click(addButtons[addButtons.length - 1]);

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

  it('groups "Alle" into eight recipes and eight ingredients', () => {
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

    // 8 list entries + the active recipe's title in the preview column and in the phone bar
    expect(screen.getAllByText(/^Rezept \d+$/)).toHaveLength(8 + 2);
    expect(screen.getAllByText(/^Zutat \d+$/)).toHaveLength(8);
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

  it('asks for unit, amount and note before adding an ingredient', () => {
    searchData.current = {
      recipes: [],
      ingredients: [
        {
          ...baseIngredient,
          start_portion_id: 5,
          portions: [{ id: 5, name: 'EL', measuring_unit: 'Gramm', measuring_unit_id: 1, quantity: 1, weight_g: 15 }],
        },
      ],
    };
    const handleSelectIngredient = vi.fn();
    render(
      <MealOmnibarDialog
        open={true}
        onOpenChange={() => {}}
        onSelectRecipe={() => {}}
        onSelectIngredient={handleSelectIngredient}
      />
    );

    fireEvent.click(screen.getAllByText('Haferflocken')[0]);
    const addButtons = screen.getAllByRole('button', { name: /Zutat hinzufügen/ });
    fireEvent.click(addButtons[addButtons.length - 1]);
    expect(handleSelectIngredient).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Menge'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Notiz (optional)'), { target: { value: 'Bio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(handleSelectIngredient).toHaveBeenCalledWith(201, 5, 1, 2, 'Haferflocken', 'Bio');
  });

  it('shows the recipe link, all ingredients with amounts, allergens and a collapsible description', () => {
    previewData.current = {
      id: 101,
      title: 'Spaghetti Bolognese',
      slug: 'spaghetti-bolognese',
      description: 'Sehr lange Beschreibung. '.repeat(20),
      recipe_portions: 1,
      target_portions: 10,
      ingredients: [
        { name: 'Hackfleisch', amount_label: '1,5 kg' },
        { name: 'Spaghetti', amount_label: '1 kg' },
      ],
      nutritional_tags: [{ id: 1, name: 'Laktose', is_dangerous: true }, { id: 2, name: 'Vegetarisch', is_dangerous: false }],
      allergens: ['Laktose'],
    };
    render(<MealOmnibarDialog open={true} onOpenChange={() => {}} onSelectRecipe={() => {}} />);

    const link = screen.getAllByRole('link', { name: /Rezept ansehen/ })[0];
    expect(link.getAttribute('href')).toBe('/recipes/spaghetti-bolognese');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(screen.getByTestId('recipe-preview-tags').textContent).toContain('Laktose');

    fireEvent.click(screen.getByRole('button', { name: /Alle 2 Zutaten mit Mengen/ }));
    expect(screen.getByTestId('recipe-preview-ingredients').textContent).toContain('1,5 kg');

    expect(screen.getByRole('button', { name: 'Mehr' })).toBeDefined();
  });

  it('opens a details sheet from the phone bar and adds from it', () => {
    const handleSelectRecipe = vi.fn();
    render(<MealOmnibarDialog open={true} onOpenChange={() => {}} onSelectRecipe={handleSelectRecipe} normPortions={12} />);

    fireEvent.click(screen.getByRole('button', { name: /Details/ }));
    // The open sheet hides the underlying dialog from the accessibility tree.
    const sheetAdd = within(screen.getByRole('dialog')).getByRole('button', { name: /Gericht hinzufügen \(12 P\.\)/ });
    fireEvent.click(sheetAdd);

    expect(handleSelectRecipe).toHaveBeenCalledWith(101, 'Spaghetti Bolognese');
  });
});
