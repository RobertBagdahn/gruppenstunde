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
});
