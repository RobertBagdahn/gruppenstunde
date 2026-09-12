import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateMealPlanDialog } from './CreateMealPlanDialog';
import { BrowserRouter } from 'react-router-dom';

const mockMutate = vi.fn();

vi.mock('@/api/mealPlans', () => ({
  useCreateMealPlan: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe('CreateMealPlanDialog', () => {
  it('renders the 3 core inputs: name, date range, and portions', () => {
    render(
      <BrowserRouter>
        <CreateMealPlanDialog open={true} onOpenChange={() => {}} />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Name des Essensplans/i)).toBeDefined();
    expect(screen.getByLabelText(/Startdatum/i)).toBeDefined();
    expect(screen.getByLabelText(/Enddatum/i)).toBeDefined();
    expect(screen.getByLabelText(/Personenanzahl/i)).toBeDefined();
  });

  it('submits form with smart defaults for reserve factor and activity factor', () => {
    render(
      <BrowserRouter>
        <CreateMealPlanDialog open={true} onOpenChange={() => {}} />
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText(/Name des Essensplans/i);
    fireEvent.change(nameInput, { target: { value: 'Pfingstlager 2026' } });

    const portionsInput = screen.getByLabelText(/Personenanzahl/i);
    fireEvent.change(portionsInput, { target: { value: '25' } });

    const submitBtn = screen.getByRole('button', { name: /Plan erstellen/i });
    fireEvent.click(submitBtn);

    expect(mockMutate).toHaveBeenCalled();
    const payload = mockMutate.mock.calls[0][0];
    expect(payload.name).toBe('Pfingstlager 2026');
    expect(payload.norm_portions).toBe(25);
    expect(payload.reserve_factor).toBe(1.1);
  });
});
