import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ActionBar from './ActionBar';
import Breadcrumbs from './Breadcrumbs';
import DetailHeader from './DetailHeader';
import FlowHeader from './FlowHeader';
import PageHeader from './PageHeader';

const wrap = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('page headers (food-page-shell)', () => {
  it('list header: one H1, count badge, breadcrumbs with the current page marked', () => {
    wrap(
      <PageHeader
        title="Rezepte"
        count={248}
        countLabel={{ one: 'Rezept', other: 'Rezepte' }}
        breadcrumbs={[{ label: 'Start', to: '/' }, { label: 'Rezepte' }]}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rezepte');
    expect(screen.getByText(/248 Rezepte/)).toBeInTheDocument();
    const current = screen.getByRole('navigation', { name: 'Brotkrumen' }).querySelector('[aria-current="page"]');
    expect(current).toHaveTextContent('Rezepte');
    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/');
  });

  it('list header: no icon tile any more, and the deprecated icon prop is ignored', () => {
    const { container } = wrap(<PageHeader title="Zutaten" />);
    expect(container.querySelector('.bg-area-ingredients-soft')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Zutaten');
  });

  it('detail header: back pill is named after its target and links there', () => {
    wrap(<DetailHeader title="Chili sin Carne" back={{ to: '/recipes', label: 'Rezepte' }} />);
    expect(screen.getByRole('link', { name: /Rezepte/ })).toHaveAttribute('href', '/recipes');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chili sin Carne');
  });

  it('flow header: close button has its own label and the progress is announced', () => {
    const onClose = vi.fn();
    wrap(<FlowHeader title="Rezept erstellen" onClose={onClose} progress="Schritt 4 von 7" progressValue={57} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rezept erstellen');
    expect(screen.getByText('Schritt 4 von 7')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Fortschritt' })).toHaveAttribute('aria-valuenow', '57');
  });

  it('flow header: the close button calls back', async () => {
    const onClose = vi.fn();
    wrap(<FlowHeader title="Kochmodus" onClose={onClose} closeLabel="Kochmodus verlassen" />);
    await userEvent.click(screen.getByRole('button', { name: 'Kochmodus verlassen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('breadcrumbs render nothing without items', () => {
    const { container } = wrap(<Breadcrumbs items={[]} />);
    expect(container.querySelector('nav')).toBeNull();
  });

  it('action bar is fixed on phones and part of the page from 768 px, rendered once', () => {
    const { container } = wrap(<ActionBar secondary={<button>Zurück</button>} primary={<button>Weiter</button>} />);
    const bar = screen.getByRole('button', { name: 'Weiter' }).closest('div.fixed');
    expect(bar?.className).toContain('md:static');
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(2);
  });
});
