import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmptyBlock from './EmptyBlock';
import NotFoundState from './NotFoundState';
import SectionError from './SectionError';

const wrap = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('empty state (food-page-states)', () => {
  it('shows one primary action and the templates from existing reference plans', () => {
    wrap(
      <EmptyBlock
        title="Noch kein Essensplan"
        description="Tage, Mahlzeiten, Budget und Einkaufsliste an einem Ort."
        action={{ label: 'Ersten Essensplan erstellen', to: '/meal-plans/new' }}
        templates={[{ id: 1, title: 'Wochenendfahrt Harz', detail: '3 Tage · 7 Mahlzeiten', to: '/meal-plans/copy/1' }]}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Noch kein Essensplan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ersten Essensplan erstellen/ })).toHaveAttribute('href', '/meal-plans/new');
    expect(screen.getByRole('link', { name: /Wochenendfahrt Harz/ })).toHaveAttribute('href', '/meal-plans/copy/1');
    expect(screen.getByText('Oder mit Vorlage starten')).toBeInTheDocument();
  });

  it('leaves the template block out without reference plans', () => {
    wrap(<EmptyBlock title="Noch kein Essensplan" description="Los geht’s." templates={[]} />);
    expect(screen.queryByText('Oder mit Vorlage starten')).toBeNull();
  });
});

describe('section error (food-page-states)', () => {
  it('shows the inline error with a retry action', () => {
    wrap(<SectionError title="Zutaten konnten nicht geladen werden" error={new Error('x')} onRetry={() => undefined} />);
    expect(screen.getByText('Zutaten konnten nicht geladen werden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument();
  });
});

describe('not-found state (food-page-states)', () => {
  it('explains the miss, offers suggestions and a way back, with the mascot', () => {
    const { container } = wrap(
      <NotFoundState
        title="Rezept nicht gefunden"
        description="Vielleicht wurde es umbenannt oder gelöscht."
        suggestions={<p>Meintest du … Chili con Verdura</p>}
        listLink={{ label: 'Alle Rezepte ansehen', to: '/recipes' }}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Rezept nicht gefunden' })).toBeInTheDocument();
    expect(screen.getByText(/Meintest du/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alle Rezepte ansehen' })).toHaveAttribute('href', '/recipes');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/images/inspi_confused.png');
  });
});
