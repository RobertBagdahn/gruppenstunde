// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripPlanSchema, type TripPlan } from '@/schemas/shoppingTrip';
import TripPlanningPage from './TripPlanningPage';

const { createTrip, updateTrip, deleteTrip, materialize, createRule, deleteRule, state, mutation } = vi.hoisted(() => ({
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  deleteTrip: vi.fn(),
  materialize: vi.fn(),
  createRule: vi.fn(),
  deleteRule: vi.fn(),
  state: { plan: null as unknown },
  mutation: (mutate: unknown) => () => ({ mutate, isPending: false, error: null, reset: () => undefined }),
}));

vi.mock('@/api/shoppingTrips', () => ({
  useTripPlan: () => ({ data: state.plan, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useCreateTrip: mutation(createTrip),
  useUpdateTrip: mutation(updateTrip),
  useDeleteTrip: mutation(deleteTrip),
  useMaterializeTrip: mutation(materialize),
  useCreateRule: mutation(createRule),
  useDeleteRule: mutation(deleteRule),
}));
vi.mock('@/api/shoppingStores', () => ({
  useStores: () => ({
    isPending: false,
    data: { items: [{ id: 2, name: 'Metro', created_at: '' }], total: 1, page: 1, page_size: 8, total_pages: 1 },
  }),
  useCreateStore: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ isLoading: false, data: { id: 5 } }) }));

const row = (overrides: Record<string, unknown>) => ({
  kind: 'ingredient', subject_id: 1, name: 'Zutat', quantity: 1000, unit: 'g', total_quantity_g: 1000, net_quantity_g: 1000,
  reserve_quantity_g: 0, sources: [{ meal_id: 11, meal_label: 'Sa Mittag', quantity_g: 500 }, { meal_id: 12, meal_label: 'So Mittag', quantity_g: 500 }],
  rule_ids: [], spread_count: 1, ...overrides,
});

function makePlan(overrides: Partial<Record<string, unknown>> = {}): TripPlan {
  return TripPlanSchema.parse({
    event_id: 1, event_slug: 'sommerlager', event_name: 'Sommerlager', can_manage: true,
    trips: [
      { list_id: 10, name: 'Metro · Fr 16.10. 09:00', store_id: 2, store_name: 'Metro', scheduled_at: '2026-10-16T07:00:00Z', status: 'planned', rows: [row({ name: 'Kartoffeln', subject_id: 4, quantity: 5000, total_quantity_g: 5000 })] },
      { list_id: 11, name: 'Rewe · Sa 17.10. 10:00', store_id: 3, store_name: 'Rewe', scheduled_at: '2026-10-17T08:00:00Z', status: 'planned', rows: [row({ name: 'Hackfleisch', subject_id: 5, quantity: 2000, total_quantity_g: 2000, spread_count: 2 })] },
      { list_id: 12, name: 'Edeka · So 18.10. 10:00', store_id: 4, store_name: 'Edeka', scheduled_at: '2026-10-18T08:00:00Z', status: 'created', items_count: 12, checked_count: 12, rows: [] },
    ],
    uncovered: [{ kind: 'ingredient', subject_id: 9, name: 'Reis', quantity: 500, meal_id: 3, meal_label: 'Fr Abend', reason: 'before_first_trip' }],
    hints: [{ kind: 'after_meal', message: 'Einkauf liegt nach der Mahlzeit', meal_id: 3, trip_id: 11, rule_id: 7 }],
    rules: [{ id: 7, target_id: 11, ingredient_id: 5, name: 'Hackfleisch' }],
    ...overrides,
  });
}

function renderPage(path = '/shopping-lists/events/sommerlager') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/shopping-lists/events/:eventSlug" element={<TripPlanningPage />} />
        <Route path="/shopping-lists/:id" element={<p>Listenseite</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TripPlanningPage', () => {
  beforeEach(() => {
    [createTrip, updateTrip, deleteTrip, materialize, createRule, deleteRule].forEach((fn) => fn.mockReset());
    state.plan = makePlan();
  });

  it('shows the trips in plan order with their ingredients and amounts', () => {
    renderPage();

    const trips = screen.getAllByRole('article').map((article) => article.getAttribute('aria-label'));
    expect(trips).toEqual(['Metro · Fr 16.10. 09:00', 'Rewe · Sa 17.10. 10:00', 'Edeka · So 18.10. 10:00']);
    const metro = screen.getByRole('article', { name: /Metro/ });
    expect(within(metro).getByText(/Kartoffeln/)).toBeInTheDocument();
    expect(within(metro).getByText(/5,0 kg/)).toBeInTheDocument();
    expect(screen.getByText('auf 2 Einkäufe verteilt')).toBeInTheDocument();
  });

  it('lists uncovered demand and the notes of the allocation', () => {
    renderPage();

    const section = screen.getByRole('region', { name: 'Nicht gedeckt und Hinweise' });
    expect(within(section).getByText(/Reis/)).toBeInTheDocument();
    expect(within(section).getByText(/Vor dem ersten Einkauf/)).toBeInTheDocument();
    expect(within(section).getByText('Hackfleisch: Einkauf liegt nach der Mahlzeit')).toBeInTheDocument();
  });

  it('creates a trip with shop and time', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Einkauf hinzufügen' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await within(dialog).findByRole('button', { name: /Metro/ }));
    await user.type(within(dialog).getByLabelText('Datum'), '2026-10-17');
    await user.type(within(dialog).getByLabelText('Uhrzeit'), '09:00');
    await user.click(within(dialog).getByRole('button', { name: 'Hinzufügen' }));

    expect(createTrip).toHaveBeenCalledWith(
      { store_id: 2, scheduled_at: '2026-10-17T09:00', name: undefined },
      expect.anything(),
    );
  });

  it('asks for the time when it is missing', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Einkauf hinzufügen' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await within(dialog).findByRole('button', { name: /Metro/ }));
    await user.type(within(dialog).getByLabelText('Datum'), '2026-10-17');
    await user.click(within(dialog).getByRole('button', { name: 'Hinzufügen' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Bitte gib an, wann eingekauft wird.');
    expect(createTrip).not.toHaveBeenCalled();
  });

  it('edits a trip', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Einkauf „Rewe · Sa 17.10. 10:00“ ändern' }));
    const dialog = await screen.findByRole('dialog');
    const time = within(dialog).getByLabelText('Uhrzeit');
    await user.clear(time);
    await user.type(time, '12:30');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    expect(updateTrip).toHaveBeenCalledWith(
      expect.objectContaining({ listId: 11, store_id: 3 }),
      expect.anything(),
    );
  });

  it('confirms deleting a created trip with the number of checked entries', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Einkauf „Edeka · So 18.10. 10:00“ löschen' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Einkauf mit 12 abgehakten Einträgen löschen?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Löschen' }));
    expect(deleteTrip).toHaveBeenCalledWith(12, expect.anything());
  });

  it('moves Hackfleisch to another planned trip for all meals', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Hackfleisch verschieben' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Verschieben nach'), '10');
    await user.click(within(dialog).getByRole('button', { name: 'Verschieben' }));

    expect(createRule).toHaveBeenCalledWith(
      { target_id: 10, ingredient_id: 5, material_id: null, meal_id: null, quantity: null },
      expect.anything(),
    );
  });

  it('moves 3 kg of the potatoes for a single meal', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Kartoffeln verschieben' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('Nur eine Mahlzeit'));
    await user.selectOptions(within(dialog).getByLabelText('Mahlzeit'), '12');
    await user.click(within(dialog).getByLabelText('Teilmenge'));
    await user.type(within(dialog).getByLabelText('Menge in Gramm'), '3000');
    await user.click(within(dialog).getByRole('button', { name: 'Verschieben' }));

    expect(createRule).toHaveBeenCalledWith(
      { target_id: 11, ingredient_id: 4, material_id: null, meal_id: 12, quantity: 3000 },
      expect.anything(),
    );
  });

  it('takes a manual allocation back', async () => {
    state.plan = makePlan({
      trips: [{ list_id: 11, name: 'Rewe · Sa 17.10. 10:00', store_id: 3, store_name: 'Rewe', scheduled_at: '2026-10-17T08:00:00Z', status: 'planned', rows: [row({ name: 'Hackfleisch', subject_id: 5, rule_ids: [7] })] }],
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Zuordnung für Hackfleisch zurücknehmen' }));

    expect(deleteRule).toHaveBeenCalledWith(7, expect.anything());
  });

  it('freezes a planned trip and opens its list', async () => {
    const user = userEvent.setup();
    renderPage();

    const metro = screen.getByRole('article', { name: /Metro/ });
    await user.click(within(metro).getByRole('button', { name: 'Liste erstellen' }));

    expect(materialize).toHaveBeenCalledWith(10, expect.objectContaining({ onSuccess: expect.any(Function) }));
    materialize.mock.calls[0][1].onSuccess();
    expect(await screen.findByText('Listenseite')).toBeInTheDocument();
  });

  it('is read-only for viewers', () => {
    state.plan = makePlan({ can_manage: false });
    renderPage();

    expect(screen.getByRole('note')).toHaveTextContent('Du kannst den Einkaufsplan nur lesen');
    expect(screen.queryByRole('button', { name: 'Einkauf hinzufügen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /verschieben/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Liste erstellen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ändern|löschen/ })).not.toBeInTheDocument();
  });

  it('shows an empty state without trips', () => {
    state.plan = makePlan({ trips: [], uncovered: [], hints: [], rules: [] });
    renderPage();

    expect(screen.getByText('Noch kein Einkauf geplant', { selector: 'h2' })).toBeInTheDocument();
  });
});
