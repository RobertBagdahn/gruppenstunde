// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getApiErrorMessage } from '@/lib/api';
import { CopyFromPlanDialog } from './CopyFromPlanDialog';

const copyMutate = vi.fn();
const notifyError = vi.fn();
const notifySuccess = vi.fn();

const sourcePlan = {
  id: 7,
  name: 'Sommerlager 2025',
  start_datetime: '2025-07-10T08:00:00',
  end_datetime: '2025-07-11T19:00:00',
  meals_count: 1,
  event_name: '',
};

const sourcePlanDetail = {
  id: 7,
  name: 'Sommerlager 2025',
  norm_portions: 10,
  meals: [
    {
      id: 70,
      meal_type: 'lunch',
      start_datetime: '2025-07-10T12:00:00',
      items: [
        { id: 700, recipe_title: 'Chili', ingredient_name: '', display_name: '', factor: 1, energy_kcal: 5000 },
      ],
    },
  ],
};

vi.mock('@/api/mealPlans', () => ({
  useMealPlansSearch: () => ({ data: [sourcePlan], isLoading: false }),
  useMealPlan: (id: number) => ({ data: id === 7 ? sourcePlanDetail : undefined }),
  useCopyItemsFromPlan: () => ({ mutate: copyMutate, isPending: false }),
}));
vi.mock('@/lib/notify', () => ({
  notify: { error: (...args: unknown[]) => notifyError(...args), success: (...args: unknown[]) => notifySuccess(...args) },
}));

async function copyLunch() {
  const user = userEvent.setup();
  render(<CopyFromPlanDialog open onOpenChange={vi.fn()} targetMealId={3} targetPlanId={1} />);
  await user.click(screen.getByRole('button', { name: /Sommerlager 2025/ }));
  await user.click(screen.getByRole('button', { name: /Donnerstag, 10. Juli/ }));
  await user.click(screen.getByRole('button', { name: /Mittagessen/ }));
  await user.click(screen.getByRole('button', { name: /Kopieren \(1 Eintrag\)/ }));
}

describe('CopyFromPlanDialog', () => {
  beforeEach(() => {
    copyMutate.mockReset();
    notifyError.mockReset();
    notifySuccess.mockReset();
  });

  it('sends only the source plan and meal, not the plan name as a note', async () => {
    await copyLunch();

    expect(copyMutate).toHaveBeenCalledTimes(1);
    expect(copyMutate.mock.calls[0][0]).toEqual({ mealId: 3, source_plan_id: 7, source_meal_id: 70 });
  });

  it('shows the German backend reason when the items are already in the meal (422)', async () => {
    const error = new ApiError(422, 'Unprocessable Entity', {
      detail: 'Rezept «Chili» ist bereits in dieser Mahlzeit enthalten',
    });
    copyMutate.mockImplementation((_body: unknown, options: { onError: (err: Error) => void }) => options.onError(error));

    await copyLunch();

    expect(notifyError).toHaveBeenCalledWith('Einträge konnten nicht kopiert werden', { error });
    expect(getApiErrorMessage(error)).toBe('Rezept «Chili» ist bereits in dieser Mahlzeit enthalten');
  });
});
