// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuickAddStufenDialog } from './QuickAddStufenDialog';

describe('QuickAddStufenDialog count input', () => {
  it('keeps an editable integer draft and blocks invalid counts', () => {
    const onBulkCreate = vi.fn();
    render(
      <QuickAddStufenDialog
        open
        onOpenChange={vi.fn()}
        onBulkCreate={onBulkCreate}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Wölflinge/ }));
    const input = screen.getByLabelText('Anzahl:') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '10' } });
    expect(input.value).toBe('10');

    fireEvent.change(input, { target: { value: '0' } });
    expect(input.value).toBe('0');
    expect(screen.getByRole('button', { name: /hinzufügen/i })).toBeDisabled();

    fireEvent.change(input, { target: { value: '5' } });
    expect(input.value).toBe('5');
    fireEvent.click(screen.getByRole('button', { name: /5× Wölflinge hinzufügen/ }));

    expect(onBulkCreate).toHaveBeenCalledWith({
      count: 5,
      stufe: 'woelflinge',
      default_age: 8,
      gender: 'no_answer',
    });
  });
});
