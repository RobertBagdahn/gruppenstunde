import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';

import { Topbar, type PipelineStage } from './Topbar';

const STAGES: PipelineStage[] = [
  { label: 'Altdaten', time: '12:59', status: 'ok' },
  { label: 'Import · 1 Hinweis', time: '07:38', status: 'warn' },
  { label: 'Forecast #25', time: '07:41', status: 'error' },
];

describe('Topbar', () => {
  it('shows area and page as breadcrumb', () => {
    renderWithProviders(<Topbar area="Arbeiten" page="Artikel" stages={[]} today="MO 18.05.2026" />);
    const crumbs = screen.getByRole('navigation', { name: 'Brotkrumen' });
    expect(within(crumbs).getByText('Arbeiten')).toBeInTheDocument();
    expect(within(crumbs).getByText('Artikel')).toHaveAttribute('aria-current', 'page');
  });

  it('shows every pipeline stage with time and an accessible status', () => {
    renderWithProviders(<Topbar area="Arbeiten" page="Artikel" stages={STAGES} today="MO 18.05.2026" />);
    const pipeline = screen.getByRole('list', { name: 'Datenfluss' });
    const items = within(pipeline).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByRole('img', { name: 'in Ordnung' })).toBeInTheDocument();
    expect(within(items[1]).getByRole('img', { name: 'Hinweis' })).toBeInTheDocument();
    expect(within(items[2]).getByRole('img', { name: 'Fehler' })).toBeInTheDocument();
    expect(within(items[1]).getByText('07:38')).toBeInTheDocument();
  });

  it('puts warning and error stages on the warning background', () => {
    renderWithProviders(<Topbar area="Arbeiten" page="Artikel" stages={STAGES} today="MO 18.05.2026" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveClass('bg-panel');
    expect(items[1]).toHaveClass('bg-warning-soft');
    expect(items[2]).toHaveClass('bg-warning-soft');
  });

  it('links to the status page and shows the date', () => {
    renderWithProviders(<Topbar area="Daten" page="Fall-Inbox" stages={[]} today="MO 18.05.2026" />);
    expect(screen.getByRole('link', { name: 'Statusansicht' })).toHaveAttribute('href', '/data/quality');
    expect(screen.getByText('MO 18.05.2026')).toBeInTheDocument();
  });
});
