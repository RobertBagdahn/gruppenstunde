import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveChip, FilterCheckbox, FilterSidebar, MoreFilters } from './FilterParts';

describe('filter building blocks (food-list-page-layout)', () => {
  it('names the phone toggle with the number of active filters', () => {
    render(
      <FilterSidebar activeCount={2}>
        <p>Gruppe</p>
      </FilterSidebar>,
    );
    expect(screen.getByRole('button', { name: /Filter \(2\)/ })).toBeInTheDocument();
  });

  it('shows the plain toggle label without active filters', () => {
    render(
      <FilterSidebar activeCount={0}>
        <p>Gruppe</p>
      </FilterSidebar>,
    );
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });

  it('opens "Weitere Filter" by itself when a hidden filter is active', () => {
    render(
      <MoreFilters activeCount={1}>
        <p>Versteckter Filter</p>
      </MoreFilters>,
    );
    expect(screen.getByRole('button', { name: /Weitere Filter/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Versteckter Filter')).toBeInTheDocument();
  });

  it('keeps checkbox rows at least 44 px high on phones', () => {
    render(<FilterCheckbox checked={false} onChange={() => undefined} label="Frühstück" />);
    expect(screen.getByText('Frühstück').closest('label')?.className).toContain('min-h-11');
  });

  it('removes an active filter through its chip', async () => {
    const onRemove = vi.fn();
    render(<ActiveChip label="Warme Mahlzeit" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Filter Warme Mahlzeit entfernen' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
