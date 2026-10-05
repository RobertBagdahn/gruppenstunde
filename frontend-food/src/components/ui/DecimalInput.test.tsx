// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DecimalInput } from './DecimalInput';

describe('DecimalInput', () => {
  it('keeps a leading-zero decimal editable and reports its numeric value', () => {
    const onChange = vi.fn();
    render(<DecimalInput value={1} min={0.1} onChange={onChange} aria-label="Faktor" />);
    const input = screen.getByLabelText('Faktor') as HTMLInputElement;
    fireEvent.focus(input);

    fireEvent.change(input, { target: { value: '0,' } });
    expect(input.value).toBe('0,');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '0,6' } });
    expect(input.value).toBe('0,6');
    expect(onChange).toHaveBeenLastCalledWith(0.6);
  });

  it('restores the last valid value when an invalid draft is blurred', () => {
    const onChange = vi.fn();
    render(<DecimalInput value={2} min={0.1} onChange={onChange} aria-label="Faktor" />);
    const input = screen.getByLabelText('Faktor') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    fireEvent.blur(input);

    expect(input.value).toBe('2');
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
});
