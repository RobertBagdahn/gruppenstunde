// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortionFormDialog } from './IngredientDetailPage';

function renderDialog(open: boolean, nextRank: number) {
  return (
    <PortionFormDialog
      open={open}
      onOpenChange={vi.fn()}
      mode="create"
      idPrefix="new-portion"
      // A fresh object literal on every render, exactly like PortionsSection passes it.
      initialValues={{ name: '', quantity: '1', unitId: '', rank: String(nextRank), weight: '' }}
      measuringUnits={[]}
      isPending={false}
      onSubmit={vi.fn()}
    />
  );
}

describe('PortionFormDialog', () => {
  it('keeps the user input when the parent re-renders while the dialog is open', () => {
    const { rerender } = render(renderDialog(false, 2));
    rerender(renderDialog(true, 2));

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Esslöffel' } });
    rerender(renderDialog(true, 2));

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Esslöffel');
  });

  it('resets to the latest initial values when the dialog is opened again', () => {
    const { rerender } = render(renderDialog(true, 2));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Esslöffel' } });

    rerender(renderDialog(false, 2));
    rerender(renderDialog(true, 3));

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Rang') as HTMLInputElement).value).toBe('3');
  });
});
