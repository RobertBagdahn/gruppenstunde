import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanCheckFlyout } from './PlanCheckFlyout';

vi.mock('@/api/mealPlans', () => ({
  usePlanCheck: () => ({
    data: {
      total_issues: 2,
      alerts: [
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
});
