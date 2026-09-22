/**
 * Tests for PortionPicker — grouped sections, label fallbacks, weight
 * warnings and selection callbacks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PortionPicker, { type PortionPickerPortion } from '@/components/recipe/PortionPicker';

vi.mock('@/api/supplies', () => ({
  useStandardMeasures: vi.fn(() => ({
    data: [
      { key: 'el', name: '1 EL', grams: 12, unit_name: 'g', is_approx: false },
      { key: 'tl', name: '1 TL', grams: 4, unit_name: 'g', is_approx: false },
      { key: 'tasse', name: '1 Tasse', grams: 160, unit_name: 'g', is_approx: false },
      { key: 'prise', name: '1 Prise', grams: 0.5, unit_name: 'g', is_approx: true },
      { key: 'msp', name: '1 Msp', grams: 0.2, unit_name: 'g', is_approx: true },
    ],
  })),
}));

const portions: PortionPickerPortion[] = [
  { id: 5, name: 'kleine (50g)', quantity: 1, weight_g: 50, measuring_unit_name: 'Gramm', rank: 1, is_weight_trusted: true },
  { id: 6, name: 'Stück', quantity: 100, weight_g: 100, measuring_unit_name: 'Gramm', rank: 2, is_weight_trusted: false },
];

function renderPicker(props: Partial<Parameters<typeof PortionPicker>[0]> = {}) {
  const onSelectPortion = vi.fn();
  const onSelectStandardMeasure = vi.fn();
  const onSelectGrams = vi.fn();
  const utils = render(
    <PortionPicker
      portions={portions}
      value={5}
      ingredientSlug="speisezwiebeln"
      onSelectPortion={onSelectPortion}
      onSelectStandardMeasure={onSelectStandardMeasure}
      onSelectGrams={onSelectGrams}
      {...props}
    />,
  );
  return { ...utils, onSelectPortion, onSelectStandardMeasure, onSelectGrams };
}

describe('PortionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sections when opened', () => {
    renderPicker();
    fireEvent.click(screen.getByLabelText('Portion wählen'));
    expect(screen.getByText('Zutat')).toBeTruthy();
    expect(screen.getByText('Standardmengen')).toBeTruthy();
    expect(screen.getByText('freie Menge')).toBeTruthy();
  });

  it('sorts portions by rank and shows weights', () => {
    const { container } = renderPicker({ portions: [...portions].reverse() });
    fireEvent.click(screen.getByLabelText('Portion wählen'));
    const optionButtons = screen.getAllByRole('option');
    const names = optionButtons.map((b) => b.textContent ?? '');
    expect(names[0]).toContain('kleine (50g)');
    expect(names[0]).toContain('50');
    expect(names[1]).toContain('Stück');
    expect(container.textContent).not.toContain('undefined');
  });

  it('marks unweighted portions with "Gewicht fehlt"', () => {
    const unweighted = [
      { id: 3, name: 'Stück', quantity: 1, weight_g: null, measuring_unit_name: 'Stück', rank: 1 },
    ] as PortionPickerPortion[];
    renderPicker({ portions: unweighted, value: 3, ingredientSlug: undefined });
    expect(screen.getByText('Gewicht fehlt')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Portion wählen'));
    expect(screen.getAllByText('Gewicht fehlt').length).toBeGreaterThan(1);
  });

  it('shows the grams section as selected when value is null', () => {
    renderPicker({ value: null });
    fireEvent.click(screen.getByLabelText('Portion wählen'));
    const options = screen.getAllByRole('option');
    const gramsRow = options[options.length - 1];
    expect(gramsRow?.getAttribute('aria-selected')).toBe('true');
  });

  it('fires onSelectPortion with the chosen portion id', () => {
    const { onSelectPortion } = renderPicker();
    fireEvent.click(screen.getByLabelText('Portion wählen'));
    const target = screen.getAllByRole('option').find((b) => b.textContent?.includes('kleine (50g)'));
    expect(target).toBeTruthy();
    fireEvent.click(target!);
    expect(onSelectPortion).toHaveBeenCalledWith(5);
  });

  it('fires onSelectStandardMeasure with the catalog entry', () => {
    const { onSelectStandardMeasure } = renderPicker();
    fireEvent.click(screen.getByLabelText('Portion wählen'));
    fireEvent.click(screen.getByText('1 EL'));
    expect(onSelectStandardMeasure).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'el', name: '1 EL', grams: 12 }),
    );
  });

  it('fires onSelectGrams for the direct gram entry', () => {
    const { onSelectGrams } = renderPicker();
    fireEvent.click(screen.getByLabelText('Portion wählen'));
    const options = screen.getAllByRole('option');
    const gramsRow = options[options.length - 1];
    expect(gramsRow?.textContent).toContain('Gramm');
    fireEvent.click(gramsRow!);
    expect(onSelectGrams).toHaveBeenCalled();
  });

  it('hides sections when there is no ingredient slug', () => {
    renderPicker({ ingredientSlug: undefined });
    fireEvent.click(screen.getByLabelText('Portion wählen'));
    expect(screen.queryByText('Standardmengen')).toBeNull();
  });
});
