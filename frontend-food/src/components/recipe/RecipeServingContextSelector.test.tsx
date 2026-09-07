// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RecipeServingContextSelector from './RecipeServingContextSelector';

describe('RecipeServingContextSelector', () => {
  it('clamps the selected context and confirms the normalized value', () => {
    const onChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <RecipeServingContextSelector value={1} onChange={onChange} onConfirm={onConfirm} />,
    );

    const input = screen.getByRole('spinbutton', { name: 'Personenzahl' });
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.click(screen.getByTestId('recipe-serving-context-confirm'));

    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows the selected value as a fixed editor summary after confirmation', () => {
    render(
      <RecipeServingContextSelector value={4} onChange={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(screen.getByText('Für wie viele Personen?')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Personenzahl' })).toHaveValue(4);
  });
});
