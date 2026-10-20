import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';
import { week } from '@/lib/week';

import { ExplanationWaterfall } from '@/components/charts/ExplanationWaterfall';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { SampleBadge, SampleDataBanner } from '@/components/shared/SampleBadge';
import { TrafficLightBadge } from '@/components/shared/TrafficLightBadge';
import { DataTable } from './DataTable';
import { KpiStrip } from './KpiStrip';
import { QueueItem } from './QueueItem';
import { QuantityStepper } from './QuantityStepper';
import { RecommendationPanel } from './RecommendationPanel';

describe('TrafficLightBadge', () => {
  it('names the colour in text, so colour is never the only signal', () => {
    renderWithProviders(<TrafficLightBadge colour="red" />);
    expect(screen.getByText('Dringend')).toBeInTheDocument();
  });

  it('keeps the meaning for screen readers when the row already names the item', () => {
    renderWithProviders(<TrafficLightBadge colour="yellow" label="" />);
    expect(screen.getByText('Einplanen', { selector: '.sr-only' })).toBeInTheDocument();
  });
});

describe('KpiStrip', () => {
  it('shows German counts and the change to last week with its sign', () => {
    renderWithProviders(
      <KpiStrip items={[{ colour: 'red', count: 1234, deltaVsLastWeek: 2 }, { colour: 'green', count: 0, deltaVsLastWeek: -1 }]} />,
    );
    expect(screen.getByText('1.234')).toBeInTheDocument();
    expect(screen.getByText('+2 zur Vorwoche')).toBeInTheDocument();
    expect(screen.getByText('-1 zur Vorwoche')).toBeInTheDocument();
  });

  it('draws a sparkline only when history is given', () => {
    renderWithProviders(<KpiStrip items={[{ colour: 'blue', count: 3, history: [1, 2, 3] }, { colour: 'red', count: 1 }]} />);
    expect(screen.getAllByRole('img', { name: 'Verlauf der letzten Wochen' })).toHaveLength(1);
  });
});

describe('QueueItem', () => {
  it('is a button that reports its selection and fires on click', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <QueueItem colour="red" title="Basilikum" sku="DGW004" kind="Bestellen" due="bis KW 24" quantity={15000} selected={false} onSelect={onSelect} />,
    );
    const item = screen.getByRole('button', { name: /Basilikum/ });
    expect(item).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('15.000 Tüten')).toBeInTheDocument();
    await userEvent.click(item);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('RecommendationPanel', () => {
  it('states the action as title and runs the actions with their shortcuts', async () => {
    const accept = vi.fn();
    renderWithProviders(
      <RecommendationPanel
        title="Bis KW 24 bestellen · 15.000 Tüten"
        reason="Bestand reicht bis KW 36."
        actions={[{ label: 'Übernehmen', shortcut: '↵', primary: true, onClick: accept }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Bis KW 24 bestellen · 15.000 Tüten' })).toBeInTheDocument();
    expect(screen.getByText('↵')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Übernehmen/ }));
    expect(accept).toHaveBeenCalledTimes(1);
  });
});

describe('QuantityStepper', () => {
  it('moves only between allowed quantities and never offers free text', () => {
    const onChange = vi.fn();
    renderWithProviders(<QuantityStepper label="Menge" value={0} step={5000} onChange={onChange} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menge verringern' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Menge erhöhen' }));
    expect(onChange).toHaveBeenLastCalledWith(5000);
  });

  it('goes from the minimum to 0 and from 15.000 to 10.000', () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(<QuantityStepper label="Menge" value={5000} step={5000} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menge verringern' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
    rerender(<QuantityStepper label="Menge" value={15000} step={5000} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menge verringern' }));
    expect(onChange).toHaveBeenLastCalledWith(10000);
  });

  it('shows the quantity with German thousands separators', () => {
    renderWithProviders(<QuantityStepper label="Menge" value={120000} step={5000} onChange={() => undefined} />);
    expect(screen.getByText('120.000 Tüten')).toBeInTheDocument();
  });
});

describe('DataTable', () => {
  it('renders header cells and one row per item', () => {
    renderWithProviders(
      <DataTable
        caption="Artikel"
        rows={[{ sku: 'DGW001', stock: 250 }, { sku: 'DGW002', stock: 1600 }]}
        rowKey={(r) => r.sku}
        columns={[
          { key: 'sku', header: 'SKU', width: '96px', render: (r) => r.sku },
          { key: 'stock', header: 'Bestand', width: '96px', align: 'right', render: (r) => r.stock },
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: 'Artikel' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(2);
    expect(within(table).getAllByRole('cell')).toHaveLength(4);
    expect(screen.getByText('1600').className).toContain('text-right');
  });
});

describe('ForecastChart', () => {
  const points = [
    { date: '2026-05-18', sales: 90 },
    { date: '2026-05-25', forecast: 120, p10: 90, p90: 150, capped: true },
    { date: '2026-06-01', forecast: 130, p10: 95, p90: 170, excluded: true },
  ];

  it('labels the interval "80-%-Bereich" and marks out-of-stock weeks and events', () => {
    renderWithProviders(
      <ForecastChart title="DGW004" points={points} outOfStockFrom="2026-06-01" markers={[{ date: '2026-05-18', label: 'Heute' }]} />,
    );
    expect(screen.getByRole('img', { name: 'DGW004' })).toBeInTheDocument();
    expect(screen.getByText('80-%-Bereich')).toBeInTheDocument();
    expect(screen.getByText('ohne Bestellung ausverkauft')).toBeInTheDocument();
    expect(screen.getByText('Heute')).toBeInTheDocument();
  });

  it('lists capped and excluded weeks in the legend only when present', () => {
    renderWithProviders(<ForecastChart title="DGW004" points={points} />);
    expect(screen.getByText('gekappt')).toBeInTheDocument();
    expect(screen.getByText('ausgeschlossen')).toBeInTheDocument();
  });
});

describe('ExplanationWaterfall', () => {
  it('ends at the planner quantity and names every step', () => {
    renderWithProviders(
      <ExplanationWaterfall
        result={15000}
        steps={[
          { key: 'demand', label: 'Prognose', delta: 42000, value: 42000 },
          { key: 'stock', label: 'Bestand', delta: -28500, value: 13500 },
        ]}
      />,
    );
    expect(screen.getByText('Prognose')).toBeInTheDocument();
    expect(screen.getByText('-28.500')).toBeInTheDocument();
    expect(screen.getByText('15.000 Tüten')).toBeInTheDocument();
  });
});

describe('sample markers', () => {
  it('marks example data as "Beispiel" and the banner as a note', () => {
    renderWithProviders(
      <>
        <SampleBadge />
        <SampleDataBanner>Lieferanten sind erfunden.</SampleDataBanner>
      </>,
    );
    expect(screen.getByText('Beispiel')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Beispieldaten.');
  });
});

describe('week label', () => {
  it('uses ISO weeks, including the year change', () => {
    expect(week('2026-07-20')).toBe('KW 30/2026');
    expect(week('2027-01-01')).toBe('KW 53/2026');
    expect(week('2026-05-18')).toBe('KW 21/2026');
  });
});
