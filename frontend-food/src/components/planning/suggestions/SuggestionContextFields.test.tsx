// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EMPTY_SUGGESTION_CONTEXT, SuggestionContextFields } from './SuggestionContextFields';

describe('SuggestionContextFields', () => {
  it('toggles age groups additively', () => {
    const onChange = vi.fn();
    render(
      <SuggestionContextFields value={{ ...EMPTY_SUGGESTION_CONTEXT, age_groups: ['children'] }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Jugendliche (12–17)' }));
    expect(onChange).toHaveBeenCalledWith({ age_groups: ['children', 'teens'] });
    fireEvent.click(screen.getByRole('button', { name: 'Kinder (6–11)' }));
    expect(onChange).toHaveBeenCalledWith({ age_groups: [] });
  });

  it('"Nichts" excludes every other cooking source and vice versa', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SuggestionContextFields
        value={{ ...EMPTY_SUGGESTION_CONTEXT, cooking_sources: ['campfire', 'gas_burner'] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nichts' }));
    expect(onChange).toHaveBeenLastCalledWith({ cooking_sources: ['none'] });

    rerender(
      <SuggestionContextFields value={{ ...EMPTY_SUGGESTION_CONTEXT, cooking_sources: ['none'] }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Lagerfeuer' }));
    expect(onChange).toHaveBeenLastCalledWith({ cooking_sources: ['campfire'] });
  });

  it('sets setting, cooling and season through the selects', () => {
    const onChange = vi.fn();
    render(<SuggestionContextFields value={EMPTY_SUGGESTION_CONTEXT} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Veranstaltungsart'), { target: { value: 'camp' } });
    fireEvent.change(screen.getByLabelText('Kühlmöglichkeit'), { target: { value: 'cooler_box' } });
    fireEvent.change(screen.getByLabelText('Wetter'), { target: { value: 'hot' } });
    expect(onChange).toHaveBeenCalledWith({ setting: 'camp' });
    expect(onChange).toHaveBeenCalledWith({ cooling: 'cooler_box' });
    expect(onChange).toHaveBeenCalledWith({ season_hint: 'hot' });
  });

  it('keeps everything optional', () => {
    render(<SuggestionContextFields value={EMPTY_SUGGESTION_CONTEXT} onChange={vi.fn()} />);
    expect(screen.getAllByText('Nicht angegeben').length).toBe(2);
    expect(screen.getByText('Aus dem Startdatum ableiten')).toBeTruthy();
  });
});
