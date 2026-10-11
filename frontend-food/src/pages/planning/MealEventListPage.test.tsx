// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calendarDaysBetween } from '@/lib/mealPlanListDisplay';
import type { MealPlan } from '@/schemas/mealPlan';
import MealEventListPage from './MealEventListPage';

const duplicate = vi.fn();
const remove = vi.fn();

const plans = [
  {
    id: 19,
    name: 'ZZ-TEST Plan mit einem sehr langen Namen für das Herbstlager',
    owner_id: 5,
    is_owner: true,
    visibility: 'private',
    meals_count: 7,
    norm_portions: 20,
    start_datetime: '2099-10-09T18:00:00Z',
    end_datetime: '2099-10-11T14:00:00Z',
    event_name: null,
    nutritional_tag_names: [],
    has_group_members: false,
    group_members_count: 0,
    collaborators_count: 0,
    budget_per_person_per_day: null,
    owner_name: null,
    can_edit: true,
    can_delete: true,
  },
  {
    id: 20,
    name: 'Bundesrat 2026',
    owner_id: 5,
    is_owner: true,
    visibility: 'private',
    meals_count: 7,
    norm_portions: 40,
    start_datetime: '2099-11-09T18:00:00Z',
    end_datetime: '2099-11-11T14:00:00Z',
    event_name: null,
    nutritional_tag_names: [],
    has_group_members: false,
    group_members_count: 0,
    collaborators_count: 0,
    budget_per_person_per_day: null,
    owner_name: null,
    can_edit: true,
    can_delete: true,
  },
] as unknown as MealPlan[];

let listedPlans: MealPlan[] = plans;

vi.mock('@/api/mealPlans', () => ({
  useMealPlans: () => ({ data: listedPlans, error: null, isLoading: false, refetch: vi.fn() }),
  useCreateMealPlan: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteMealPlan: () => ({ mutate: remove, isPending: false }),
  useDuplicateMealPlan: () => ({ mutate: duplicate, isPending: false }),
}));
vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ isLoading: false, data: { id: 5 } }) }));
vi.mock('@/components/planning/MealPlanFilterSidebar', () => ({ default: () => <div /> }));
vi.mock('@/components/recipe/NutritionalTagMultiSelect', () => ({ default: () => <div /> }));

function renderPage() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
      <MealEventListPage />
    </MemoryRouter>,
  );
}

describe('MealEventListPage plan rows', () => {
  beforeEach(() => {
    duplicate.mockReset();
    remove.mockReset();
    listedPlans = plans;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the plan name readable: up to two lines, badge outside the heading, full name as tooltip', () => {
    renderPage();

    const heading = screen.getByRole('heading', { name: /ZZ-TEST Plan mit einem sehr langen Namen/ });
    expect(heading.className).toContain('line-clamp-2');
    expect(heading.className).not.toContain('truncate');
    expect(heading.getAttribute('title')).toBe(plans[0].name);
    expect(within(heading).queryByText('Mein Plan')).toBeNull();
  });

  it('shows plan details in the row', async () => {
    window.history.pushState({}, '', '/');
    renderPage();

    expect(screen.getByText('40 Portionen')).toBeTruthy();
    expect(screen.getAllByText('7 Mahlzeiten')).toHaveLength(2);
  });

  it('names the plan in the delete dialog', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Aktionen für Bundesrat 2026' }));
    await user.click(await screen.findByRole('menuitem', { name: /Löschen/ }));

    expect(await screen.findByText('Essensplan „Bundesrat 2026“ löschen?')).toBeTruthy();
  });

  it('prefills the copy name with a suffix but submits the typed name unchanged', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Aktionen für Bundesrat 2026' }));
    await user.click(await screen.findByRole('menuitem', { name: /Als Vorlage verwenden/ }));

    const nameInput = (await screen.findByDisplayValue('Bundesrat 2026 (Kopie)')) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Sommerlager 2027');
    await user.click(screen.getByRole('button', { name: 'Erstellen' }));

    expect(duplicate).toHaveBeenCalledTimes(1);
    expect(duplicate.mock.calls[0][0]).toMatchObject({ id: 20, name: 'Sommerlager 2027' });
  });

  it('separates current and past plans so a month heading and its key appear once per section', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-11T12:00:00'));
    const consoleError = vi.spyOn(console, 'error');
    // Server order for date_upcoming: upcoming ascending, then past descending — October appears in both parts.
    listedPlans = [
      { ...plans[0], id: 31, name: 'Herbstfahrt', start_datetime: '2026-10-16T18:00:00', end_datetime: '2026-10-18T14:00:00' },
      { ...plans[0], id: 32, name: 'Wochenendlager', start_datetime: '2026-10-02T18:00:00', end_datetime: '2026-10-04T14:00:00' },
      { ...plans[0], id: 33, name: 'Sommerlager', start_datetime: '2026-08-01T10:00:00', end_datetime: '2026-08-08T10:00:00' },
    ];

    renderPage();
    vi.useRealTimers();

    const current = screen.getByRole('region', { name: 'Aktuell & kommend' });
    const past = screen.getByRole('region', { name: 'Vergangen' });
    expect(within(current).getByText('Herbstfahrt')).toBeTruthy();
    expect(within(current).getByRole('heading', { name: /Oktober 2026/ })).toBeTruthy();
    expect(within(past).getByText('Wochenendlager')).toBeTruthy();
    expect(within(past).getByText('Sommerlager')).toBeTruthy();
    expect(within(past).getByRole('heading', { name: /Oktober 2026/ })).toBeTruthy();
    expect(within(current).queryByText('Wochenendlager')).toBeNull();
    const duplicateKeyWarnings = consoleError.mock.calls.filter((call) => String(call[0]).includes('same key'));
    expect(duplicateKeyWarnings).toEqual([]);
  });

  it('prefills the template end with the same number of calendar days and the source end time', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Aktionen für Bundesrat 2026' }));
    await user.click(await screen.findByRole('menuitem', { name: /Als Vorlage verwenden/ }));
    await user.click(screen.getByRole('button', { name: 'Erstellen' }));

    expect(duplicate).toHaveBeenCalledTimes(1);
    const { start_datetime: start, end_datetime: end } = duplicate.mock.calls[0][0] as { start_datetime: string; end_datetime: string };
    const sourceEnd = new Date(plans[1].end_datetime as string);
    expect(calendarDaysBetween(start, end)).toBe(calendarDaysBetween(plans[1].start_datetime as string, plans[1].end_datetime as string));
    expect(new Date(end).getHours()).toBe(sourceEnd.getHours());
    expect(new Date(end).getMinutes()).toBe(sourceEnd.getMinutes());
  });

  it('blocks a template copy whose day count differs from the source with a German message', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderPage();

    await user.click(screen.getByRole('button', { name: 'Aktionen für Bundesrat 2026' }));
    await user.click(await screen.findByRole('menuitem', { name: /Als Vorlage verwenden/ }));
    const [startInput, endInput] = Array.from(
      baseElement.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]'),
    );
    const startDate = startInput.value.slice(0, 10);
    const longerEnd = new Date(`${startDate}T12:00`);
    longerEnd.setDate(longerEnd.getDate() + 4);
    fireEvent.change(endInput, { target: { value: `${longerEnd.toISOString().slice(0, 10)}T12:00` } });
    await user.click(screen.getByRole('button', { name: 'Erstellen' }));

    expect(duplicate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'Der Zeitraum muss wie die Vorlage 3 Tage umfassen (aktuell 5 Tage).',
    );
  });
});
