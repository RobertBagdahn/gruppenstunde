import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecipeThumbnail from './RecipeThumbnail';
import RecipeTypeTag from './RecipeTypeTag';
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';

describe('recipe thumbnail (recipe-thumbnail, food-design-system)', () => {
  it('shows the uploaded photo when there is one', () => {
    render(<RecipeThumbnail imageUrl="/media/chili.jpg" title="Chili" recipeType="warm_meal" />);
    const img = screen.getByRole('img', { name: 'Chili' });
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('/media/chili.jpg');
  });

  it('uses the type tint without a photo, and never a placeholder picture', () => {
    const { container } = render(<RecipeThumbnail imageUrl={null} title="Chili" recipeType="warm_meal" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.bg-category-warm-soft')).not.toBeNull();
    expect(container.innerHTML).not.toContain('inspi_cook');
  });

  it('gives each recipe type its own tint', () => {
    const cases: [string, string][] = [
      ['breakfast', 'bg-category-breakfast-soft'],
      ['cold_meal', 'bg-category-cold-soft'],
      ['dessert', 'bg-category-dessert-soft'],
      ['snack', 'bg-category-snack-soft'],
      ['recipe_part', 'bg-category-recipe-part-soft'],
      ['drink', 'bg-category-drink-soft'],
    ];
    for (const [type, tint] of cases) {
      const { container, unmount } = render(<RecipeThumbnail imageUrl={null} title="x" recipeType={type} />);
      expect(container.querySelector(`.${tint}`), type).not.toBeNull();
      unmount();
    }
  });

  it('falls back to the neutral surface when the type is blank', () => {
    const { container } = render(<RecipeThumbnail imageUrl={null} title="Ohne Typ" recipeType="" />);
    expect(container.querySelector('.bg-muted')).not.toBeNull();
  });
});

describe('recipe type tag', () => {
  it('renders the German label in the type tint', () => {
    render(<RecipeTypeTag type="drink" />);
    const tag = screen.getByText('Getränk').closest('span.rounded-full');
    expect(tag?.className).toContain('bg-category-drink-soft');
  });

  it('renders nothing for a blank type', () => {
    const { container } = render(<RecipeTypeTag type="" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('nutri-score badge sizes (food-design-system)', () => {
  it('draws the small badge at 24 px and the medium one at 32 px', () => {
    const { rerender } = render(<NutriScoreBadge value="B" size="sm" />);
    expect(screen.getByRole('img', { name: 'Nutri-Score B' }).className).toContain('h-6');
    rerender(<NutriScoreBadge value="B" size="md" />);
    expect(screen.getByRole('img', { name: 'Nutri-Score B' }).className).toContain('h-8');
  });
});
