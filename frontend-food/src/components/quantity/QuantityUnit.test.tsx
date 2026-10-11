// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
import type { UnitOption } from '@/schemas/quantityUnits';
import { QuantityUnitInput, QuantityUnitLabel, type QuantityUnitItem } from './QuantityUnit';
import UnitPicker from './UnitPicker';

const options: UnitOption[] = [
  { key: 'portion:7', kind: 'portion', label: 'Stück', grams_per_unit: 60, is_approx: false, has_weight: true, portion_id: 7, measuring_unit_id: null, standard_measure_key: null },
  { key: 'portion:8', kind: 'portion', label: 'Portion ohne Gewicht', grams_per_unit: null, is_approx: false, has_weight: false, portion_id: 8, measuring_unit_id: null, standard_measure_key: null },
  { key: 'standard:el', kind: 'standard', label: 'EL', grams_per_unit: 15, is_approx: true, has_weight: true, portion_id: null, measuring_unit_id: null, standard_measure_key: 'el' },
  { key: 'standard:prise', kind: 'standard', label: 'Prise', grams_per_unit: 0.5, is_approx: true, has_weight: true, portion_id: null, measuring_unit_id: null, standard_measure_key: 'prise' },
  { key: 'grams', kind: 'grams', label: 'g', grams_per_unit: 1, is_approx: false, has_weight: true, portion_id: null, measuring_unit_id: 1, standard_measure_key: null },
];

vi.mock('@/api/supplies', () => ({
  useUnitOptions: (ids: number[]) => ({ data: new Map(ids.map((id) => [id, options])), isLoading: false }),
}));

const rolls: QuantityUnitItem = {
  ingredient_id: 3,
  quantity: 90,
  quantity_g: 90,
  unit_kind: 'grams',
  unit_label: 'g',
  measuring_unit_name: 'Gramm',
  portion_id: null,
  standard_measure_key: '',
  is_weight_approx: false,
  has_missing_weight: false,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function renderWithRouter(node: React.ReactNode) {
  return render(<MemoryRouter future={ROUTER_FUTURE_FLAGS}>{node}<LocationProbe /></MemoryRouter>);
}

describe('UnitPicker', () => {
  it('offers a direct action to complete a missing portion weight', () => {
    const onMissingWeight = vi.fn();
    renderWithRouter(
      <UnitPicker
        options={options}
        selectedKey="grams"
        triggerLabel="g"
        onSelect={vi.fn()}
        onMissingWeight={onMissingWeight}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gewicht ergänzen' }));

    expect(onMissingWeight).toHaveBeenCalledWith(expect.objectContaining({ portion_id: 8, has_weight: false }));
  });
});

describe('QuantityUnitLabel', () => {
  it('switches the view without saving anything', () => {
    renderWithRouter(<QuantityUnitLabel item={rolls} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menge in anderer Einheit anzeigen' }));
    fireEvent.click(screen.getByRole('option', { name: /Stück/ }));

    expect(screen.getByText('1,5 Stück (90 g)')).toBeTruthy();
  });

  it('opens the ingredient portion editor from the editable missing-weight action', () => {
    renderWithRouter(<QuantityUnitInput item={{ ...rolls, ingredient_slug: 'broetchen' }} onCommit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gewicht ergänzen' }));

    expect(screen.getByTestId('location').textContent).toBe('/ingredients/broetchen?editPortion=8#portions');
  });

  it('shows only grams in the page-wide grams view', () => {
    renderWithRouter(<QuantityUnitLabel item={{ ...rolls, quantity: 1.5, unit_kind: 'portion', unit_label: 'Stück', portion_id: 7 }} viewMode="grams" />);
    expect(screen.getByText('90 g')).toBeTruthy();
  });
});

describe('QuantityUnitInput', () => {
  it('converts the number when switching the unit and saves only after typing', () => {
    const onCommit = vi.fn();
    renderWithRouter(<QuantityUnitInput item={rolls} onCommit={onCommit} />);
    const input = screen.getByLabelText('Menge') as HTMLInputElement;
    expect(screen.getByText('= 90 g')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    fireEvent.click(screen.getByRole('option', { name: /Stück/ }));
    expect(input.value).toBe('1,5');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '2' } });
    expect(screen.getByText('= 120 g')).toBeTruthy();
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith({ quantity: 2, portion_id: 7, measuring_unit_id: null, standard_measure_key: null });
  });

  it('saves a pinch of salt as a standard measure', () => {
    const onCommit = vi.fn();
    renderWithRouter(<QuantityUnitInput item={{ ...rolls, quantity: 1, quantity_g: 1 }} onCommit={onCommit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    fireEvent.click(screen.getByRole('option', { name: /Prise/ }));
    const input = screen.getByLabelText('Menge');
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith({ quantity: 1, portion_id: null, measuring_unit_id: null, standard_measure_key: 'prise' });
  });

  it('keeps the unit when only the number changes', () => {
    const onCommit = vi.fn();
    renderWithRouter(<QuantityUnitInput item={rolls} onCommit={onCommit} />);
    const input = screen.getByLabelText('Menge');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith({ quantity: 100 });
  });

  it('saves a unit switch at constant weight right away when onConvertUnit is given', () => {
    const onCommit = vi.fn();
    const onConvertUnit = vi.fn();
    renderWithRouter(<QuantityUnitInput item={rolls} onCommit={onCommit} onConvertUnit={onConvertUnit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    fireEvent.click(screen.getByRole('option', { name: /Stück/ }));

    expect(onConvertUnit).toHaveBeenCalledWith(
      { portion_id: 7, measuring_unit_id: null, standard_measure_key: null },
      { onError: expect.any(Function) },
    );
    expect((screen.getByLabelText('Menge') as HTMLInputElement).value).toBe('1,5');
    expect(screen.getByText('= 90 g')).toBeTruthy();
    fireEvent.blur(screen.getByLabelText('Menge'));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('returns to the stored unit when the constant-weight save fails', () => {
    const onConvertUnit = vi.fn();
    renderWithRouter(<QuantityUnitInput item={rolls} onCommit={vi.fn()} onConvertUnit={onConvertUnit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    fireEvent.click(screen.getByRole('option', { name: /EL/ }));
    expect((screen.getByLabelText('Menge') as HTMLInputElement).value).toBe('6');

    act(() => onConvertUnit.mock.calls[0][1].onError());

    expect((screen.getByLabelText('Menge') as HTMLInputElement).value).toBe('90');
    expect(screen.getByRole('button', { name: 'Einheit wählen' }).textContent).toBe('g');
  });

  it('does not convert into a unit without weight; the typed amount is saved on confirm', () => {
    const onCommit = vi.fn();
    const onConvertUnit = vi.fn();
    renderWithRouter(<QuantityUnitInput item={rolls} onCommit={onCommit} onConvertUnit={onConvertUnit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    fireEvent.click(screen.getByRole('option', { name: /Portion ohne Gewicht/ }));
    const input = screen.getByLabelText('Menge') as HTMLInputElement;
    expect(input.value).toBe('1');
    expect(onConvertUnit).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith({ quantity: 1, portion_id: 8, measuring_unit_id: null, standard_measure_key: null });
  });

  it('keeps a typed amount pending instead of converting immediately', () => {
    const onCommit = vi.fn();
    const onConvertUnit = vi.fn();
    renderWithRouter(<QuantityUnitInput item={rolls} onCommit={onCommit} onConvertUnit={onConvertUnit} />);
    const input = screen.getByLabelText('Menge') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Einheit wählen' }));
    fireEvent.click(screen.getByRole('option', { name: /Stück/ }));

    expect(onConvertUnit).not.toHaveBeenCalled();
    expect(input.value).toBe('2');
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith({ quantity: 2, portion_id: 7, measuring_unit_id: null, standard_measure_key: null });
  });
});
