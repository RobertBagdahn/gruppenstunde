import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('form controls on phones (food-design-system: 16 px inputs, 44 px height)', () => {
  it('renders inputs with 16 px text and a 44 px height', () => {
    render(<Input aria-label="Suche" />);
    const input = screen.getByLabelText('Suche');
    expect(input.className).toContain('text-emphasis');
    expect(input.className).toContain('h-11');
    expect(input.classList.contains('text-body')).toBe(false);
  });
});
