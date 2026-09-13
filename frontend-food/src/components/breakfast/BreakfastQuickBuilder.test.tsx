import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BreakfastQuickBuilder } from './BreakfastQuickBuilder';

const mockMutate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/api/breakfast', () => ({
  useBreakfastCatalog: () => ({
    data: {
      base_ingredients: [
        { id: 1, name: 'Mischbrot', portions: [{ id: 11, measuring_unit_id: 1, weight_g: 50 }] },
        { id: 2, name: 'Haferflocken', portions: [{ id: 12, measuring_unit_id: 1, weight_g: 40 }] },
      ],
      fat_ingredients: [
        { id: 1, name: 'Butter', portions: [{ id: 21, measuring_unit_id: 1, weight_g: 15 }] },
      ],
      topping_ingredients: [
        { id: 1, name: 'Gouda', portions: [{ id: 31, measuring_unit_id: 1, weight_g: 30 }] },
        { id: 2, name: 'Marmelade', portions: [{ id: 32, measuring_unit_id: 1, weight_g: 25 }] },
      ],
      extra_ingredients: [
        { id: 1, name: 'Äpfel', portions: [{ id: 41, measuring_unit_id: 1, weight_g: 100 }] },
      ],
      drink_recipes: [
        { id: 1, title: 'Kaffee', portions: [] },
        { id: 2, title: 'Früchtetee', portions: [] },
      ],
    },
    isLoading: false,
  }),
  useSaveDirectMeal: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe('BreakfastQuickBuilder', () => {
  it('renders all 4 sections with group size badge', () => {
    render(
      <BreakfastQuickBuilder
        open={true}
        onOpenChange={() => {}}
        mealPlanId={42}
        mealId={10}
        normPortions={25}
      />
    );

    expect(screen.getByText(/1-Screen Frühstücksbaukasten/i)).toBeDefined();
    expect(screen.getByText('25 Personen')).toBeDefined();
    expect(screen.getByText('Brot & Basis')).toBeDefined();
    expect(screen.getByText('Aufstriche & Belag')).toBeDefined();
    expect(screen.getByText('Frisches & Extras')).toBeDefined();
    expect(screen.getByText('Getränke')).toBeDefined();
  });

  it('calculates auto-scaled grams for group size (80g * 25 = 2000g)', () => {
    render(
      <BreakfastQuickBuilder
        open={true}
        onOpenChange={() => {}}
        mealPlanId={42}
        mealId={10}
        normPortions={25}
      />
    );

    // 80g * 25 = 2000 g
    expect(screen.getByText(/2000 g Basis gesamt/i)).toBeDefined();
  });

  it('offers the detailed expert wizard', () => {
    render(
      <BreakfastQuickBuilder
        open={true}
        onOpenChange={() => {}}
        mealPlanId={42}
        mealId={10}
        normPortions={20}
      />
    );

    expect(screen.getByRole('button', { name: /Expertenmodus öffnen/i })).toBeDefined();
  });

  it('submits auto-scaled meal items on save click', () => {
    render(
      <BreakfastQuickBuilder
        open={true}
        onOpenChange={() => {}}
        mealPlanId={42}
        mealId={10}
        normPortions={10}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Buffet übernehmen/i });
    fireEvent.click(saveBtn);

    expect(mockMutate).toHaveBeenCalled();
  });
});
