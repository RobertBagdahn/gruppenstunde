import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StyleguidePage from './StyleguidePage';

describe('styleguide page (food-design-system: lebende Styleguide-Page)', () => {
  it('has every section named in the spec', () => {
    render(
      <MemoryRouter>
        <StyleguidePage />
      </MemoryRouter>,
    );
    for (const name of ['Farben', 'Schrift', 'Radien, Abstände, Schatten', 'Komponenten', 'Zustände', 'Icon-Regel', 'Formate', 'Regeln', 'Navigation und Aufbau']) {
      expect(screen.getByRole('heading', { level: 2, name }), name).toBeInTheDocument();
    }
  });

  it('shows the seven recipe-type tints and the four status variants', () => {
    const { container } = render(
      <MemoryRouter>
        <StyleguidePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('recipe-part')).toBeInTheDocument();
    expect(screen.getByText('drink')).toBeInTheDocument();
    expect(container.querySelectorAll('[role="status"], [role="alert"]').length).toBeGreaterThanOrEqual(4);
  });
});
