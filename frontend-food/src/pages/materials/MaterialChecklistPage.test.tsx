// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MaterialChecklistPage from './MaterialChecklistPage';
import type { MaterialListResult } from '@/schemas/supply';

vi.mock('@/api/materials', () => ({
  useMaterialList: vi.fn(),
}));
vi.mock('@/lib/notify', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { useMaterialList } from '@/api/materials';
import { notify } from '@/lib/notify';

const LIST: MaterialListResult = {
  title: 'Sommerlager',
  devices: [
    { material_id: 1, name: 'Topf', slug: 'topf', is_consumable: false, amount: 1, price_per_piece: null, cost: null, recipes: [{ id: 9, title: 'Eintopf', slug: 'eintopf', amount: 1 }] },
  ],
  consumables: [
    { material_id: 2, name: 'Pappteller', slug: 'pappteller', is_consumable: true, amount: 40, price_per_piece: 0.06, cost: 2.4, recipes: [] },
  ],
  total_cost: 2.4,
};

function renderPage(search = '?meal-plan=3') {
  return render(
    <MemoryRouter initialEntries={[`/material-list${search}`]}>
      <MaterialChecklistPage />
    </MemoryRouter>,
  );
}

function mockList(data: MaterialListResult | undefined, extra: Record<string, unknown> = {}) {
  (useMaterialList as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data,
    isPending: data === undefined,
    error: null,
    refetch: vi.fn(),
    ...extra,
  });
}

describe('MaterialChecklistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('asks for a source when none is given', () => {
    mockList(undefined);
    renderPage('');
    expect(screen.getByText('Keine Materialliste ausgewählt')).toBeTruthy();
  });

  it('requests the list of the plan from the URL', () => {
    mockList(LIST);
    renderPage('?meal-plan=3');
    expect(useMaterialList).toHaveBeenCalledWith({ kind: 'meal-plan', id: 3 });
  });

  it('requests a recipe list with servings', () => {
    mockList(LIST);
    renderPage('?recipe=7&servings=12');
    expect(useMaterialList).toHaveBeenCalledWith({ kind: 'recipe', id: 7, servings: 12 });
  });

  it('shows devices and consumables with their recipes', () => {
    mockList(LIST);
    renderPage();
    expect(screen.getByText('Topf')).toBeTruthy();
    expect(screen.getByText('für Eintopf')).toBeTruthy();
    expect(screen.getByText('40×')).toBeTruthy();
  });

  it('keeps ticks only in the browser', async () => {
    mockList(LIST);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const first = renderPage();
    fireEvent.click(screen.getByLabelText('Pappteller abhaken'));
    await waitFor(() => {
      expect(localStorage.getItem('material-list-checked:meal-plan:3')).toBe('[2]');
    });
    first.unmount();

    renderPage();
    await waitFor(() => {
      expect((screen.getByLabelText('Pappteller abhaken') as HTMLInputElement).checked).toBe(true);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('copies the list as text', async () => {
    mockList(LIST);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPage();
    fireEvent.click(screen.getByTestId('material-list-copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain('Verbrauchsmaterial\n- Pappteller: 40×');
    expect(notify.success).toHaveBeenCalledWith('Materialliste kopiert');
  });

  it('shows an empty state without material', () => {
    mockList({ title: 'Plan', devices: [], consumables: [], total_cost: 0 });
    renderPage();
    expect(screen.getByText('Kein Material nötig')).toBeTruthy();
  });
});
