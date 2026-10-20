import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/render';

import { Sidebar } from './Sidebar';

const USER = { name: 'Daniel', role: 'Einkauf' };

describe('Sidebar', () => {
  it('shows the four navigation groups with all entries', () => {
    renderWithProviders(<Sidebar currentWeek={21} user={USER} />);
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    for (const group of ['Arbeiten', 'Analyse', 'Daten', 'Hilfe']) expect(within(nav).getByText(group)).toBeInTheDocument();
    expect(within(nav).getAllByRole('link')).toHaveLength(12);
  });

  it('highlights the active route', () => {
    renderWithProviders(<Sidebar currentWeek={21} user={USER} />, { route: '/products' });
    expect(screen.getByRole('link', { name: /Artikel/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Entscheidungen/ })).not.toHaveAttribute('aria-current');
  });

  it('marks only the start page as active on "/"', () => {
    renderWithProviders(<Sidebar currentWeek={21} user={USER} />, { route: '/' });
    const active = screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page');
    expect(active.map((link) => link.textContent)).toEqual(['Entscheidungen']);
  });

  it('shows the calendar week next to the brand and a dash while unknown', () => {
    const { unmount } = renderWithProviders(<Sidebar currentWeek={21} user={USER} />);
    expect(screen.getByText('KW 21')).toBeInTheDocument();
    unmount();
    renderWithProviders(<Sidebar currentWeek={null} user={USER} />);
    expect(screen.getByText('KW –')).toBeInTheDocument();
  });

  it('renders counters in German format and the warn counter highlighted', () => {
    renderWithProviders(<Sidebar currentWeek={21} user={USER} badges={{ openDecisions: 23, activeProducts: 1174 }} />);
    expect(screen.getByText('23')).toHaveClass('bg-traffic-yellow');
    expect(screen.getByText('1.174')).not.toHaveClass('bg-traffic-yellow');
  });

  it('hides zero counters', () => {
    renderWithProviders(<Sidebar currentWeek={21} user={USER} badges={{ openCases: 0 }} />);
    expect(screen.getByRole('link', { name: 'Fall-Inbox' }).textContent).toBe('Fall-Inbox');
  });

  it('renders filters with a working reset and settings below the navigation', async () => {
    const onReset = vi.fn();
    renderWithProviders(
      <Sidebar currentWeek={21} user={USER} filters={<span>Filterinhalt</span>} onResetFilters={onReset} settings={<span>Ansichtsinhalt</span>} />,
    );
    const filters = screen.getByRole('region', { name: 'Filter' });
    expect(within(filters).getByText('Filterinhalt')).toBeInTheDocument();
    await userEvent.click(within(filters).getByRole('button', { name: 'Zurücksetzen' }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(within(screen.getByRole('region', { name: 'Ansicht' })).getByText('Ansichtsinhalt')).toBeInTheDocument();
  });

  it('omits empty filter and settings sections', () => {
    renderWithProviders(<Sidebar currentWeek={21} user={USER} />);
    expect(screen.queryByRole('region', { name: 'Filter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ansicht' })).not.toBeInTheDocument();
  });

  it('shows the user with a link to the settings', () => {
    renderWithProviders(<Sidebar currentWeek={21} user={USER} />);
    expect(screen.getByText('Daniel')).toBeInTheDocument();
    expect(screen.getByText('Einkauf')).toBeInTheDocument();
    // Two entries lead to the settings page: the Hilfe group and the user's icon link.
    const links = screen.getAllByRole('link', { name: 'Einstellungen' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', '/settings');
  });
});
