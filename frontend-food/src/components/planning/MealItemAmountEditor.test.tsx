// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { MealItem } from '@/schemas/mealPlan';
import { notify } from '@/lib/notify';
import { MealItemAmountEditor, MealItemAmountText, MealItemNote, type MealItemUpdateCallbacks } from './MealItemAmountEditor';

vi.mock('@/lib/notify', () => ({ notify: { changed: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

const portions = [
  { id: 1, name: 'Gramm', quantity: 1, weight_g: 1, rank: 1, is_default: true, measuring_unit_id: 1, measuring_unit_name: 'Gramm' },
  { id: 2, name: 'EL', quantity: 1, weight_g: 30, rank: 2, is_default: false, measuring_unit_id: 1, measuring_unit_name: 'Gramm' },
];

vi.mock('@/api/supplies', () => ({
  useIngredientPortions: () => ({ data: portions }),
  useUnitOptions: (ids: number[]) => ({
    data: new Map(ids.map((id) => [id, [
      { key: 'portion:1', kind: 'portion', label: 'Gramm', grams_per_unit: 1, is_approx: false, has_weight: true, portion_id: 1, measuring_unit_id: 1, standard_measure_key: null },
      { key: 'portion:2', kind: 'portion', label: 'EL', grams_per_unit: 30, is_approx: false, has_weight: true, portion_id: 2, measuring_unit_id: null, standard_measure_key: null },
      { key: 'grams', kind: 'grams', label: 'g', grams_per_unit: 1, is_approx: false, has_weight: true, portion_id: null, measuring_unit_id: 1, standard_measure_key: null },
      { key: 'grams', kind: 'grams', label: 'g', grams_per_unit: 1, is_approx: false, has_weight: true, portion_id: null, measuring_unit_id: 1, standard_measure_key: null },
    ]])),
    isLoading: false,
  }),
}));

const item: MealItem = {
  id: 9,
  recipe_id: null,
  recipe_title: '',
  recipe_slug: '',
  image_url: null,
  ingredient_id: 3,
  ingredient_name: 'Frischkäse',
  ingredient_slug: 'frischkaese',
  quantity: 0.5,
  measuring_unit_id: 1,
  measuring_unit_name: 'Gramm',
  portion_id: 2,
  portion_name: 'EL',
  standard_measure_key: '',
  unit_kind: 'portion',
  unit_label: 'EL',
  is_weight_approx: false,
  display_name: null,
  note: '',
  factor: 1,
  active_recipe_item_ids: [],
  variant_group_id: null,
  energy_kcal: 37,
  cost_eur: 0.1,
  quantity_g: 15,
  ingredient_tags: [],
  recipe_type: '',
  overrides: [],
  has_missing_weight: false,
  is_per_norm_person: true,
  buffet_role: '',
  is_breakfast_assistant: false,
  warnings: [],
};

function wrap(node: ReactNode) {
  return <MemoryRouter><QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider></MemoryRouter>;
}

describe('MealItemAmountText', () => {
  it('names the portion instead of its gram unit', () => {
    render(wrap(<MealItemAmountText item={item} />));
    expect(screen.getByText(/0,5 EL/)).toBeTruthy();
    expect(screen.queryByText(/Gramm/)).toBeNull();
  });

  it('switches the unit for viewing only (read-only)', () => {
    render(wrap(<MealItemAmountText item={item} />));
    fireEvent.click(screen.getByRole('button', { name: 'Menge in anderer Einheit anzeigen' }));
    const gramsOption = screen.getAllByRole('option').find((option) => option.textContent?.trim() === 'g');
    fireEvent.click(gramsOption!);

    expect(screen.getByText('15 g')).toBeTruthy();
    expect(screen.queryByLabelText('Menge')).toBeNull();
    expect(notify.changed).not.toHaveBeenCalled();
  });
});

describe('MealItemAmountEditor', () => {
  it('converts at constant weight when only the unit is switched and offers undo', () => {
    const onUpdateItem = vi.fn();
    render(wrap(<MealItemAmountEditor item={item} onUpdateItem={onUpdateItem} />));
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    const gramsOption = screen.getAllByRole('option').find((option) => option.textContent?.trim() === 'g');
    fireEvent.click(gramsOption!);

    expect(onUpdateItem).toHaveBeenCalledTimes(1);
    const [itemId, patch, callbacks] = onUpdateItem.mock.calls[0] as [number, object, MealItemUpdateCallbacks];
    expect(itemId).toBe(9);
    expect(patch).toEqual({ portion_id: null, standard_measure_key: null, measuring_unit_id: 1 });
    expect(screen.getByDisplayValue('15')).toBeTruthy();

    callbacks.onSuccess?.({
      ...item,
      quantity: 15,
      portion_id: null,
      portion_name: '',
      unit_kind: 'grams',
      unit_label: 'g',
    });
    expect(notify.changed).toHaveBeenCalledWith('Einheit', expect.any(Function), {
      description: '0,5 EL (15 g) → 15 g',
    });

    const undo = vi.mocked(notify.changed).mock.calls[0][1]!;
    undo();
    expect(onUpdateItem).toHaveBeenLastCalledWith(9, {
      quantity: 0.5,
      portion_id: 2,
      measuring_unit_id: null,
      standard_measure_key: null,
    });
  });

  it('sends the selected unit and count when editing the amount', () => {
    const onUpdateItem = vi.fn();
    render(wrap(<MealItemAmountEditor item={item} onUpdateItem={onUpdateItem} />));
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    const gramsOption = screen.getAllByRole('option').find((option) => option.textContent?.trim() === 'g');
    expect(gramsOption).toBeTruthy();
    fireEvent.click(gramsOption!);
    const input = screen.getByLabelText('Menge');
    fireEvent.change(input, { target: { value: '16' } });
    fireEvent.blur(input);

    expect(onUpdateItem).toHaveBeenCalledWith(9, { quantity: 16, portion_id: null, standard_measure_key: null, measuring_unit_id: 1 });
  });

  it('sends the quantity typed in the chosen unit', () => {
    const onUpdateItem = vi.fn();
    render(wrap(<MealItemAmountEditor item={item} onUpdateItem={onUpdateItem} />));

    const input = screen.getByDisplayValue('0,5');
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.blur(input);

    expect(onUpdateItem).toHaveBeenCalledWith(9, { quantity: 2 });
  });
});

describe('MealItemNote', () => {
  it('saves an edited note on blur', () => {
    const onUpdateItem = vi.fn();
    render(<MealItemNote item={item} canEdit onUpdateItem={onUpdateItem} />);

    fireEvent.click(screen.getByRole('button', { name: 'Notiz hinzufügen' }));
    const input = screen.getByLabelText('Notiz zu Frischkäse');
    fireEvent.change(input, { target: { value: ' ohne Zwiebeln ' } });
    fireEvent.blur(input);

    expect(onUpdateItem).toHaveBeenCalledWith(9, { note: 'ohne Zwiebeln' });
  });

  it('shows the note as plain text when not editable', () => {
    render(<MealItemNote item={{ ...item, note: 'Bio' }} canEdit={false} />);
    expect(screen.getByText('Bio')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
