// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Portion } from '@/schemas/supply';
import IngredientQuantityDialog from './IngredientQuantityDialog';

vi.mock('@/api/supplies', () => ({
  useStandardMeasures: vi.fn(() => ({ data: [] })),
}));

const cup: Portion = {
  id: 10,
  name: 'Tasse Mehl',
  quantity: 1,
  weight_g: 100,
  rank: 1,
  is_default: true,
  measuring_unit_id: 5,
  measuring_unit_name: 'Gramm',
};

const gram: Portion = {
  id: 11,
  name: 'g',
  quantity: 1,
  weight_g: 1,
  rank: 9999,
  is_default: false,
  measuring_unit_id: 6,
  measuring_unit_name: 'Gramm',
};

function renderDialog(portions: Portion[], onConfirm = vi.fn()) {
  render(
    <IngredientQuantityDialog
      ingredient={{ id: 1, name: 'Weizenmehl Type 405', slug: 'weizenmehl-type-405', portions }}
      open
      onOpenChange={vi.fn()}
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

describe('IngredientQuantityDialog', () => {
  it('confirms the default portion with its id', () => {
    const onConfirm = renderDialog([cup, gram]);

    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(onConfirm).toHaveBeenCalledWith(10, 5, 1);
  });

  it('maps "Gramm" to the gram portion instead of a null portion', () => {
    const onConfirm = renderDialog([cup, gram]);

    fireEvent.click(screen.getByRole('button', { name: 'Portion wählen' }));
    fireEvent.click(screen.getByRole('option', { name: /^Gramm/ }));
    fireEvent.change(screen.getByLabelText('Menge'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(onConfirm).toHaveBeenCalledWith(11, 6, 250);
  });

  it('accepts a German decimal comma without replacing the input while typing', () => {
    const onConfirm = renderDialog([cup, gram]);
    const quantityInput = screen.getByLabelText('Menge') as HTMLInputElement;

    fireEvent.change(quantityInput, { target: { value: '' } });
    expect(quantityInput.value).toBe('');
    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeDisabled();

    fireEvent.change(quantityInput, { target: { value: '0,' } });
    expect(quantityInput.value).toBe('0,');
    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeDisabled();

    fireEvent.change(quantityInput, { target: { value: '0,6' } });
    expect(quantityInput.value).toBe('0,6');
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(onConfirm).toHaveBeenCalledWith(10, 5, 0.6);
  });

  it('accepts a decimal point as an alternative separator', () => {
    const onConfirm = renderDialog([cup, gram]);
    fireEvent.change(screen.getByLabelText('Menge'), { target: { value: '0.6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(onConfirm).toHaveBeenCalledWith(10, 5, 0.6);
  });

  it('does not offer "Gramm" when the ingredient has no gram portion', () => {
    renderDialog([cup]);

    fireEvent.click(screen.getByRole('button', { name: 'Portion wählen' }));

    expect(screen.queryByRole('option', { name: /^Gramm/ })).toBeNull();
  });

  it('cannot be confirmed without any portion', () => {
    const onConfirm = renderDialog([]);

    const confirm = screen.getByRole('button', { name: 'Hinzufügen' }) as HTMLButtonElement;
    fireEvent.click(confirm);

    expect(confirm.disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/noch keine Portion/)).toBeTruthy();
  });
});
