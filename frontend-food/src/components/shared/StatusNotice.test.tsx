import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusNotice from './StatusNotice';

describe('status notice (food-design-system: Fläche, Rand und Icon)', () => {
  it('pairs the warning surface, border and icon for missing meals', () => {
    const { container } = render(<StatusNotice variant="warning">Freitag: Mittagessen fehlt noch</StatusNotice>);
    const box = container.firstElementChild as HTMLElement;
    expect(box.className).toContain('bg-warning-soft');
    expect(box.className).toContain('border-warning-border');
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Freitag: Mittagessen fehlt noch');
  });

  it('announces a danger notice as an alert', () => {
    render(<StatusNotice variant="danger">Speichern fehlgeschlagen</StatusNotice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Speichern fehlgeschlagen');
  });
});
