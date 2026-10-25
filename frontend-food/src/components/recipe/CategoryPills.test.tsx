import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryPills from './CategoryPills';

describe('CategoryPills (food-colorful-detail: white chips with dots)', () => {
  it('renders a colour dot per recipe type and none on "Alle"', () => {
    const { container } = render(<CategoryPills selected={new Set()} onChange={() => {}} />);
    const dots = container.querySelectorAll('span[aria-hidden="true"].rounded-full');
    expect(dots).toHaveLength(7);
    const alle = screen.getByRole('button', { name: 'Alle' });
    expect(alle.querySelector('span')).toBeNull();
  });

  it('marks the active chip with border and text, not a filled surface', () => {
    render(<CategoryPills selected={new Set(['dessert'])} onChange={() => {}} />);
    const active = screen.getByRole('button', { name: 'Nachtisch' });
    expect(active.getAttribute('aria-pressed')).toBe('true');
    expect(active.className).toContain('border-primary');
    expect(active.className).not.toContain('bg-primary');
    expect(active.className).toContain('bg-card');
  });

  it('toggles a type on click', () => {
    const calls: Set<string>[] = [];
    render(<CategoryPills selected={new Set()} onChange={(v) => calls.push(v)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Snack' }));
    expect([...calls[0]]).toEqual(['snack']);
  });
});
