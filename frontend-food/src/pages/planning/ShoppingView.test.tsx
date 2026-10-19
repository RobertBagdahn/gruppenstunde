// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ShoppingView from './ShoppingView';

vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ data: { id: 5 } }) }));
vi.mock('@/api/mealPlans', () => ({
  useShoppingList: () => ({
    data: [
      {
        ingredient_name: 'Mehl',
        total_quantity_g: 500,
        net_quantity_g: 450,
        reserve_quantity_g: 50,
        retail_section: 'Backwaren',
        sources: [],
        portion_options: [],
        package_options: [],
        estimated_price_eur: 1.2,
      },
    ],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useIngredientScan: () => ({ data: { violations: [] } }),
}));
vi.mock('@/components/planning/LinkEventDialog', () => ({
  default: ({ open, onLinked }: { open: boolean; onLinked: (slug: string) => void }) =>
    open ? (
      <div role="dialog">
        Event verknüpfen
        <button type="button" onClick={() => onLinked('herbstfahrt')}>
          Verknüpfen
        </button>
      </div>
    ) : null,
}));

const plan = { name: 'Herbstfahrt', start_datetime: null, end_datetime: null };

function renderView(props: { eventSlug?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={['/plan']}>
      <Routes>
        <Route path="/plan" element={<ShoppingView mealPlanId={41} plan={plan} {...props} />} />
        <Route path="/shopping-lists/events/:slug" element={<p>Einkäufe planen Seite</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ShoppingView', () => {
  it('still shows the total demand of the plan', () => {
    renderView({ eventSlug: 'sommerlager' });

    expect(screen.getByText('Mehl')).toBeInTheDocument();
  });

  it('no longer creates a list directly', () => {
    renderView({ eventSlug: 'sommerlager' });

    expect(screen.queryByRole('button', { name: 'Einkaufsliste erstellen' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('plan-shopping-consumables')).not.toBeInTheDocument();
  });

  it('links to the trip planning of the event', async () => {
    const user = userEvent.setup();
    renderView({ eventSlug: 'sommerlager' });

    const link = screen.getByRole('link', { name: 'Einkäufe planen' });
    expect(link).toHaveAttribute('href', '/shopping-lists/events/sommerlager');
    await user.click(link);
    expect(await screen.findByText('Einkäufe planen Seite')).toBeInTheDocument();
  });

  it('asks for an event when the plan has none and opens the planning after linking', async () => {
    const user = userEvent.setup();
    renderView();

    expect(screen.getByText('Für Einkäufe braucht der Plan ein Event.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Einkäufe planen' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Event verknüpfen' }));
    await user.click(await screen.findByRole('button', { name: 'Verknüpfen' }));

    expect(await screen.findByText('Einkäufe planen Seite')).toBeInTheDocument();
  });
});
