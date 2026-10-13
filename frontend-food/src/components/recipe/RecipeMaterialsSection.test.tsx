// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecipeMaterialsSection from './RecipeMaterialsSection';
import type { RecipeMaterial } from '@/schemas/recipe';

function material(overrides: Partial<RecipeMaterial>): RecipeMaterial {
  return {
    id: 1,
    material_id: 1,
    material_name: 'Pappteller',
    material_slug: 'pappteller',
    material_category: 'kitchen',
    is_consumable: true,
    amount: 1,
    quantity_mode: 'per_portion',
    price_per_piece: null,
    sort_order: 0,
    ...overrides,
  };
}

const MATERIALS: RecipeMaterial[] = [
  material({}),
  material({ id: 2, material_id: 2, material_name: 'Zahnstocher', material_slug: 'zahnstocher', amount: 30, quantity_mode: 'total' }),
  material({ id: 3, material_id: 3, material_name: 'Backofen', material_slug: 'backofen', is_consumable: false, amount: 1, quantity_mode: 'total' }),
  material({ id: 4, material_id: 4, material_name: 'Topf', material_slug: 'topf', is_consumable: false, amount: 2, quantity_mode: 'total' }),
];

function renderSection(servings: number, items = MATERIALS) {
  return render(
    <MemoryRouter>
      <RecipeMaterialsSection recipeId={5} materials={items} servings={servings} />
    </MemoryRouter>,
  );
}

describe('RecipeMaterialsSection', () => {
  it('shows devices and consumables in separate groups', () => {
    renderSection(8);
    const devices = within(screen.getByTestId('materials-group-Benötigte Geräte'));
    const consumables = within(screen.getByTestId('materials-group-Verbrauchsmaterial'));
    expect(devices.getByText('Backofen')).toBeTruthy();
    expect(devices.getByText('Topf')).toBeTruthy();
    expect(consumables.getByText('Pappteller')).toBeTruthy();
    expect(consumables.getByText('Zahnstocher')).toBeTruthy();
  });

  it('scales per-portion amounts and keeps fixed amounts', () => {
    renderSection(12);
    expect(screen.getByText('12×')).toBeTruthy();
    expect(screen.getByText('30×')).toBeTruthy();
  });

  it('shows no multiplier for a single device but a count for several', () => {
    renderSection(1);
    const devices = within(screen.getByTestId('materials-group-Benötigte Geräte'));
    expect(devices.getByText('2×')).toBeTruthy();
    expect(devices.queryByText('1×')).toBeNull();
  });

  it('hides empty groups', () => {
    renderSection(4, [MATERIALS[2]]);
    expect(screen.queryByTestId('materials-group-Verbrauchsmaterial')).toBeNull();
  });

  it('renders nothing without materials', () => {
    const { container } = renderSection(4, []);
    expect(container.firstChild).toBeNull();
  });

  it('links to the material list with the servings', () => {
    renderSection(6);
    expect(screen.getByTestId('materials-list-link').getAttribute('href')).toBe('/material-list?recipe=5&servings=6');
  });
});
