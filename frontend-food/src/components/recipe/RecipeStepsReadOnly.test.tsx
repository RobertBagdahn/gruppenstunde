// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecipeStepsReadOnly from './RecipeStepsReadOnly';
import type { RecipeStep } from '@/schemas/recipeStep';

function makeStep(overrides: Partial<RecipeStep>): RecipeStep {
  return {
    id: 1,
    sort_order: 0,
    instruction: 'Alles mischen',
    section: '',
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    step_ingredients: [],
    ...overrides,
  };
}

describe('RecipeStepsReadOnly', () => {
  it('shows a German empty state without steps', () => {
    render(<RecipeStepsReadOnly steps={[]} />);
    expect(screen.getByText('Keine Zubereitungsschritte vorhanden.')).toBeInTheDocument();
  });

  it('renders legacy markdown instructions when structured steps are absent', () => {
    render(
      <RecipeStepsReadOnly
        steps={[]}
        fallbackInstructions={['1. Mehl und Milch verrühren.', '2. In der Pfanne ausbacken.']}
      />,
    );

    expect(screen.getByText('Mehl und Milch verrühren.')).toBeInTheDocument();
    expect(screen.getByText('In der Pfanne ausbacken.')).toBeInTheDocument();
    expect(screen.queryByText('Keine Zubereitungsschritte vorhanden.')).toBeNull();
  });

  it('renders numbered instructions with durations', () => {
    render(
      <RecipeStepsReadOnly
        steps={[
          makeStep({ id: 1, instruction: 'Teig kneten', duration_minutes: 10 }),
          makeStep({ id: 2, instruction: 'Backen', duration_minutes: 30 }),
        ]}
      />,
    );

    expect(screen.getByText('Teig kneten')).toBeInTheDocument();
    expect(screen.getByText('Backen')).toBeInTheDocument();
    expect(screen.getByText('⏱ ca. 10 min')).toBeInTheDocument();
    expect(screen.getByText('⏱ ca. 30 min')).toBeInTheDocument();
  });

  it('renders section headings only once per section', () => {
    render(
      <RecipeStepsReadOnly
        steps={[
          makeStep({ id: 1, section: 'Teig', instruction: 'Kneten' }),
          makeStep({ id: 2, section: 'Teig', instruction: 'Ruhen lassen' }),
          makeStep({ id: 3, section: 'Backen', instruction: 'In den Ofen' }),
        ]}
      />,
    );

    expect(screen.getAllByText('Teig')).toHaveLength(1);
    expect(screen.getAllByText('Backen')).toHaveLength(1);
  });

  it('renders step ingredients with scaled quantities and units', () => {
    render(
      <RecipeStepsReadOnly
        scale={2}
        steps={[
          makeStep({
            id: 1,
            instruction: 'Nimm das Mehl',
            step_ingredients: [
              {
                id: 10,
                recipe_item_id: 5,
                quantity_modifier: 1,
                preparation: 'gesiebt',
                sort_order: 0,
                ingredient_name: 'Mehl',
                unit_short: 'g',
                quantity: 100,
                note: null,
              },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText(/200 g Mehl/)).toBeInTheDocument();
    expect(screen.getByText(/gesiebt/)).toBeInTheDocument();
  });

  it('shows portion and direct-gram step ingredients with the ingredient list amounts', () => {
    render(
      <RecipeStepsReadOnly
        scale={2}
        steps={[
          makeStep({
            id: 1,
            instruction: 'Anbraten',
            step_ingredients: [
              {
                id: 11,
                recipe_item_id: 6,
                quantity_modifier: 1,
                preparation: '',
                sort_order: 0,
                ingredient_name: 'Sojagranulat',
                portion_name: 'Portion',
                unit_short: 'Portion',
                quantity: 0.35,
                weight_g: 17.5,
                note: null,
              },
              {
                id: 12,
                recipe_item_id: 7,
                quantity_modifier: 1,
                preparation: '',
                sort_order: 1,
                ingredient_name: 'Reis',
                portion_name: null,
                unit_short: 'g',
                quantity: 80,
                weight_g: 80,
                note: null,
              },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText('0,7 Portion (35 g) Sojagranulat')).toBeInTheDocument();
    expect(screen.getByText('160 g Reis')).toBeInTheDocument();
  });

  it('shows a beverage step ingredient in ml like the ingredient list', () => {
    render(
      <RecipeStepsReadOnly
        scale={2}
        steps={[
          makeStep({
            id: 1,
            instruction: 'Aufgießen',
            step_ingredients: [
              {
                id: 13,
                recipe_item_id: 8,
                quantity_modifier: 1,
                preparation: '',
                sort_order: 0,
                ingredient_name: 'Milch',
                portion_name: null,
                unit_short: 'g',
                quantity: 206,
                weight_g: 206,
                ingredient_viscosity: 'beverage',
                ingredient_density: 1.03,
                note: null,
              },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText('400 ml Milch')).toBeInTheDocument();
  });
});
