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

  it('shows a field-level person-count validation error accessibly', () => {
    render(
      <RecipeServingContextSelector value={null} onChange={vi.fn()} error="Bitte gib eine Personenzahl ein." />,
    );

    const input = screen.getByRole('spinbutton', { name: 'Personenzahl' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'recipe-serving-context-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte gib eine Personenzahl ein.');
  });

  it('shows the selected value as a fixed editor summary after confirmation', () => {
    render(
      <RecipeServingContextSelector value={4} onChange={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(screen.getByText('Für wie viele Personen?')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Personenzahl' })).toHaveValue(4);
  });
});
