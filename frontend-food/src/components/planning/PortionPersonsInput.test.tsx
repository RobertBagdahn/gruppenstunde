import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortionPersonsInput } from './PortionPersonsInput';

describe('PortionPersonsInput', () => {
  it('displays the calculated persons from factor and base portions', () => {
    // factor = 2.5, basePortions = 10 -> 25 persons
    render(
      <PortionPersonsInput
        factor={2.5}
        basePortions={10}
        onChangeFactor={() => {}}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('25');
  });

  it('calculates and commits new factor when persons input is changed', () => {
    const handleChangeFactor = vi.fn();
    // basePortions = 4 (default recipe yield)
    render(
      <PortionPersonsInput
        factor={1.0}
        basePortions={4}
        onChangeFactor={handleChangeFactor}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('4');

    // Change to 20 persons -> factor should be 20 / 4 = 5.0
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.blur(input);

    expect(handleChangeFactor).toHaveBeenCalledWith(5.0);
  });

  it('handles decimal portions with comma or dot correctly', () => {
    const handleChangeFactor = vi.fn();
    render(
      <PortionPersonsInput
        factor={1.0}
        basePortions={10}
        onChangeFactor={handleChangeFactor}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15,5' } });
    fireEvent.blur(input);

    expect(handleChangeFactor).toHaveBeenCalledWith(1.55);
  });
});
