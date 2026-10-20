import { useState } from 'react';

import { DataTable, KpiStrip, QueueItem, QuantityStepper, RecommendationPanel } from '@/components/blocks';
import { ExplanationWaterfall } from '@/components/charts/ExplanationWaterfall';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { SampleBadge, SampleDataBanner } from '@/components/shared/SampleBadge';
import { TrafficLightBadge } from '@/components/shared/TrafficLightBadge';

/** One example per building block of layout D, so each block can be looked at and tested in place. */
export function BlockExamples() {
  const [quantity, setQuantity] = useState(15_000);
  const [selected, setSelected] = useState('DGW004');
  const points = [
    { date: '2026-03-16', sales: 90, forecast: undefined },
    { date: '2026-03-23', sales: 110, forecast: undefined },
    { date: '2026-03-30', sales: 95, forecast: undefined },
    { date: '2026-05-18', forecast: 120, p10: 90, p90: 150 },
    { date: '2026-05-25', forecast: 125, p10: 92, p90: 160, capped: true },
    { date: '2026-06-01', forecast: 130, p10: 95, p90: 170 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-caption text-muted-foreground">KpiStrip</span>
        <KpiStrip
          items={[
            { colour: 'red', count: 9, deltaVsLastWeek: 2, history: [3, 4, 5, 4, 6, 7, 6, 8, 7, 8, 9, 9] },
            { colour: 'yellow', count: 14, deltaVsLastWeek: -1, history: [10, 12, 11, 13, 12, 14, 13, 15, 14, 13, 15, 14] },
            { colour: 'green', count: 131, deltaVsLastWeek: 0, history: [120, 122, 125, 127, 128, 130, 129, 131, 130, 131, 131, 131] },
            { colour: 'blue', count: 20, deltaVsLastWeek: 1 },
          ]}
        />
      </div>

      <div className="flex max-w-md flex-col gap-2">
        <span className="text-caption text-muted-foreground">QueueItem</span>
        <div className="overflow-hidden rounded-lg border border-border bg-sunken">
          <QueueItem
            colour="red"
            title="Basilikum Genoveser"
            sku="DGW004"
            kind="Bestellen"
            due="bis KW 24"
            quantity={15_000}
            context="Ausverkauf in KW 36, Lieferzeit 12 Wochen"
            selected={selected === 'DGW004'}
            onSelect={() => setSelected('DGW004')}
          />
          <QueueItem
            colour="yellow"
            title="Schnittlauch"
            sku="DGW012"
            kind="Freigeben"
            due="bis KW 30"
            context="Bestand reicht bis KW 38"
            selected={selected === 'DGW012'}
            onSelect={() => setSelected('DGW012')}
          />
        </div>
      </div>

      <div className="flex max-w-xl flex-col gap-2">
        <span className="text-caption text-muted-foreground">RecommendationPanel</span>
        <RecommendationPanel
          title={`Bis KW 24 bestellen · ${quantity.toLocaleString('de-DE')} Tüten`}
          reason="Bestand reicht bis KW 36; Wareneingang nach 12 Wochen."
          alternative="Alternative: 20.000 Tüten (Rest bis KW 39)."
          actions={[
            { label: 'Übernehmen', shortcut: '↵', primary: true, onClick: () => undefined },
            { label: 'Zurückstellen', shortcut: 'Z', onClick: () => undefined },
          ]}
        >
          <QuantityStepper label="Menge" value={quantity} step={5_000} onChange={setQuantity} />
        </RecommendationPanel>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption text-muted-foreground">ForecastChart</span>
        <div className="max-w-2xl rounded-lg border border-border bg-panel p-4">
          <ForecastChart
            title="Absatz, Prognose und 80-%-Bereich für DGW004"
            points={points}
            outOfStockFrom="2026-06-01"
            markers={[
              { date: '2026-01-01', label: 'Jahreswechsel' },
              { date: '2026-03-20', label: '20.03.' },
              { date: '2026-05-18', label: 'Heute' },
            ]}
          />
        </div>
      </div>

      <div className="flex max-w-xl flex-col gap-2">
        <span className="text-caption text-muted-foreground">ExplanationWaterfall</span>
        <div className="rounded-lg border border-border bg-panel p-4">
          <ExplanationWaterfall
            result={15_000}
            steps={[
              { key: 'demand', label: 'Prognose bis KW 39/2027', delta: 42_000, value: 42_000, note: 'davon 31 % über Sets' },
              { key: 'min', label: 'Mindestbestand', delta: 30, value: 42_030 },
              { key: 'stock', label: 'Bestand zum Stichtag', delta: -28_500, value: 13_530 },
              { key: 'round', label: 'Rundung im 5.000er-Raster', delta: 1_470, value: 15_000, note: 'Schwelle 80 %' },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption text-muted-foreground">DataTable</span>
        <DataTable
          caption="Beispieltabelle"
          rows={[
            { sku: 'DGW004', title: 'Basilikum Genoveser', stock: 3_030, colour: 'red' as const },
            { sku: 'DGW012', title: 'Schnittlauch', stock: 8_400, colour: 'yellow' as const },
          ]}
          rowKey={(r) => r.sku}
          columns={[
            { key: 'sku', header: 'SKU', width: '96px', render: (r) => r.sku },
            { key: 'title', header: 'Artikel', width: 'minmax(0,2fr)', render: (r) => r.title },
            { key: 'stock', header: 'Bestand', width: '96px', align: 'right', render: (r) => r.stock.toLocaleString('de-DE') },
            { key: 'colour', header: 'Ampel', width: '120px', render: (r) => <TrafficLightBadge colour={r.colour} /> },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption text-muted-foreground">SampleBadge und SampleDataBanner</span>
        <div className="flex max-w-xl flex-col gap-3">
          <SampleDataBanner>Lieferanten, Artikel und Einkaufspreise sind frei erfunden.</SampleDataBanner>
          <span className="flex items-center gap-2 text-dense text-foreground-2">
            Kanal „Online-Shop“ <SampleBadge />
          </span>
        </div>
      </div>
    </div>
  );
}
