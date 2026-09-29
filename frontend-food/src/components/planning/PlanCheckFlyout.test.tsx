import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanCheckFlyout } from './PlanCheckFlyout';

vi.mock('@/api/mealPlans', () => ({
  usePlanCheck: () => ({
    data: {
      total_issues: 2,
      alerts: [
        {
          id: 'empty-day-2026-08-15',
          type: 'empty_day',
          severity: 'info',
          title: 'Samstag, 15.08. ist leer',
          description: 'Für diesen Tag ist noch keine Mahlzeit geplant.',
          date: '2026-08-15',
          action_label: 'Mahlzeiten anlegen',
          action_type: 'open_day',
        },
        {
          id: 'recipe-type-mismatch-7',
          type: 'recipe_type_mismatch',
          severity: 'info',
          title: 'Wraps mit Gemüsefüllung passt nicht zum Frühstück',
          description: 'Das Rezept ist als kalte Mahlzeit eingeordnet.',
          date: '2026-08-12',
          meal_id: 7,
          meal_type: 'breakfast',
          action_label: 'Rezept tauschen',
          action_type: 'open_slot',
        },
        {
          id: 'missing-quantity-9',
          type: 'missing_quantity',
          severity: 'warning',
          title: '4-Kornflocken Bio hat keine Menge',
          description: 'Ohne Menge fehlen Energie und Kosten.',
          date: '2026-08-12',
          meal_id: 9,
          meal_type: 'breakfast',
          action_label: 'Menge setzen',
          action_type: 'open_slot',
        },
        {
          id: 'missing-quantity-ref-167-149',
          type: 'missing_quantity',
          severity: 'warning',
          title: 'Menge fehlt in der Referenz Frühstück',
          description: '«4-Kornflocken Bio» hat keine gültige Menge.',
          date: null,
          meal_id: 167,
          meal_type: 'breakfast',
          action_label: 'Referenz öffnen',
          action_type: 'open_ref_meal',
        },
        {
          id: 'meal-outside-range-11',
          type: 'meal_outside_range',
          severity: 'warning',
          title: 'Mahlzeit außerhalb des Planzeitraums',
          description: 'Das Abendessen am 01.01. liegt außerhalb des Zeitraums.',
          date: '2026-01-01',
          meal_id: 11,
          meal_type: 'dinner',
          action_label: 'Mahlzeit verschieben',
          action_type: 'open_slot',
        },
        {
          id: 'empty-slot-10',
          type: 'empty_slot',
          severity: 'warning',
          title: 'Mittagessen ist noch leer',
          description: 'Am 12.08. ist noch kein Gericht hinterlegt.',
          date: '2026-08-12',
          meal_id: 10,
          meal_type: 'lunch',
          action_label: 'Gericht vorschlagen',
          action_type: 'suggest_recipe',
        },
        {
          id: 'allergen-conflict-12',
          type: 'allergen_conflict',
          severity: 'error',
          title: 'Einschränkung verletzt',
          description: 'Enthält Erdnuss.',
          date: '2026-08-14',
          meal_id: 12,
          meal_type: 'dinner',
          action_label: 'Gericht ansehen',
          action_type: 'open_slot',
        },
        {
          id: 'budget-excess-2026-08-13',
          type: 'budget_excess',
          severity: 'warning',
          title: 'Budget am 2026-08-13 überschritten',
          description: 'Geplant sind 6,50 € / Person (1,50 € über Budget).',
          date: '2026-08-13',
          action_label: 'Budget ansehen',
          action_type: 'open_budget',
        },
      ],
    },
    isLoading: false,
  }),
}));

describe('PlanCheckFlyout', () => {
  it('renders trigger button with badge count', () => {
    render(<PlanCheckFlyout mealPlanId={42} />);
    expect(screen.getByText(/Plan-Check \(2\)/i)).toBeDefined();
  });

  it('opens dialog on click and displays alert details with action buttons', () => {
    const handleScrollToMeal = vi.fn();
    const handleOpenOmnibar = vi.fn();

    render(
      <PlanCheckFlyout
        mealPlanId={42}
        onScrollToMeal={handleScrollToMeal}
        onOpenOmnibar={handleOpenOmnibar}
      />
    );

    const trigger = screen.getByRole('button', { name: /Plan-Check öffnen/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Mittagessen ist noch leer')).toBeDefined();
    expect(screen.getByText('Budget am 2026-08-13 überschritten')).toBeDefined();

    // Click action button on empty slot alert
    const actionBtn = screen.getByRole('button', { name: /Gericht vorschlagen/i });
    fireEvent.click(actionBtn);

    expect(handleScrollToMeal).toHaveBeenCalledWith(10);
    expect(handleOpenOmnibar).toHaveBeenCalledWith(10);
  });

  it('handles open_slot action by scrolling to meal without opening omnibar', () => {
    const handleScrollToMeal = vi.fn();
    const handleOpenOmnibar = vi.fn();

    render(
      <PlanCheckFlyout
        mealPlanId={42}
        onScrollToMeal={handleScrollToMeal}
        onOpenOmnibar={handleOpenOmnibar}
      />
    );

    const trigger = screen.getByRole('button', { name: /Plan-Check öffnen/i });
    fireEvent.click(trigger);

    const viewBtn = screen.getByRole('button', { name: /Gericht ansehen/i });
    fireEvent.click(viewBtn);

    expect(handleScrollToMeal).toHaveBeenCalledWith(12);
    expect(handleOpenOmnibar).not.toHaveBeenCalled();
  });

  it('sorts errors before warnings before hints', () => {
    render(<PlanCheckFlyout mealPlanId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /Plan-Check öffnen/i }));

    const titles = screen
      .getAllByTestId('plan-check-alert')
      .map((el) => el.querySelector('.font-bold')?.textContent);
    expect(titles[0]).toBe('Einschränkung verletzt');
    expect(titles.slice(-2)).toEqual([
      'Samstag, 15.08. ist leer',
      'Wraps mit Gemüsefüllung passt nicht zum Frühstück',
    ]);
    expect(screen.getByRole('region', { name: 'Hinweise' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Warnungen' })).toBeDefined();
  });

  it('opens the recipe search for recipe_type_mismatch', () => {
    const handleScrollToMeal = vi.fn();
    const handleOpenOmnibar = vi.fn();
    render(
      <PlanCheckFlyout mealPlanId={42} onScrollToMeal={handleScrollToMeal} onOpenOmnibar={handleOpenOmnibar} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Plan-Check öffnen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Rezept tauschen/i }));

    expect(handleScrollToMeal).toHaveBeenCalledWith(7);
    expect(handleOpenOmnibar).toHaveBeenCalledWith(7);
  });

  it('scrolls to the meal for missing_quantity without opening the recipe search', () => {
    const handleScrollToMeal = vi.fn();
    const handleOpenOmnibar = vi.fn();
    render(
      <PlanCheckFlyout mealPlanId={42} onScrollToMeal={handleScrollToMeal} onOpenOmnibar={handleOpenOmnibar} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Plan-Check öffnen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Menge setzen/i }));

    expect(handleScrollToMeal).toHaveBeenCalledWith(9);
    expect(handleOpenOmnibar).not.toHaveBeenCalled();
  });

  it('creates meals for an empty day', () => {
    const handleCreateDayMeals = vi.fn();
    render(<PlanCheckFlyout mealPlanId={42} onCreateDayMeals={handleCreateDayMeals} />);
    fireEvent.click(screen.getByRole('button', { name: /Plan-Check öffnen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Mahlzeiten anlegen/i }));

    expect(handleCreateDayMeals).toHaveBeenCalledWith('2026-08-15');
  });

  it('offers to adjust the plan period for meals outside the range', () => {
    const handleOpenSettings = vi.fn();
    render(<PlanCheckFlyout mealPlanId={42} onOpenSettings={handleOpenSettings} />);
    fireEvent.click(screen.getByRole('button', { name: /Plan-Check öffnen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Zeitraum anpassen/i }));

    expect(handleOpenSettings).toHaveBeenCalled();
  });

  it('shows alerts without action buttons for viewers', () => {
    render(<PlanCheckFlyout mealPlanId={42} canEdit={false} onOpenSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Plan-Check öffnen/i }));

    expect(screen.getByText('4-Kornflocken Bio hat keine Menge')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Menge setzen/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Zeitraum anpassen/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Gericht vorschlagen/i })).toBeNull();
  });

  it('opens the reference meal editor for a missing quantity in a reference meal', () => {
    const handleOpenRefMeal = vi.fn();
    const handleScrollToMeal = vi.fn();
    render(<PlanCheckFlyout mealPlanId={42} onOpenRefMeal={handleOpenRefMeal} onScrollToMeal={handleScrollToMeal} />);
    fireEvent.click(screen.getByRole('button', { name: /Plan-Check öffnen/i }));
    fireEvent.click(screen.getByRole('button', { name: /Referenz öffnen/i }));

    expect(handleOpenRefMeal).toHaveBeenCalledWith('breakfast');
    expect(handleScrollToMeal).not.toHaveBeenCalled();
  });
});
