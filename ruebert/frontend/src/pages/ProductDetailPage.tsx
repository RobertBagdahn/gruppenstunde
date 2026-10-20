import { Link, useParams } from 'react-router-dom';

import { useProduct } from '@/api/queries';
import { DataTable, type Column } from '@/components/blocks/DataTable';
import { ExplanationWaterfall } from '@/components/charts/ExplanationWaterfall';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { SampleBadge } from '@/components/shared/SampleBadge';
import { TrafficLightBadge } from '@/components/shared/TrafficLightBadge';
import { formatInt, formatPercent, MISSING } from '@/lib/format';
import { chartPoints } from '@/lib/productChart';

type ModelRow = { model: string; selected: boolean; wape: number | null; bias: number | null; coverage: number | null; evaluated: boolean };

const percent = (value: number | null) => (value === null ? 'nicht bewertet' : formatPercent(value));

/** Article detail: one sentence, chart, demand origin, derivation, model comparison and journal history (article-views). */
export function ProductDetailPage() {
  const { sku = '' } = useParams();
  const query = useProduct(sku);
  const d = query.data;

  const modelColumns: Column<ModelRow>[] = [
    { key: 'model', header: 'Modell', width: 'minmax(0,2fr)', render: (r) => (r.selected ? `${r.model} · gewählt` : r.model) },
    { key: 'wape', header: 'WAPE', width: '96px', align: 'right', render: (r) => (r.evaluated ? percent(r.wape) : 'nicht bewertet') },
    { key: 'bias', header: 'Bias', width: '96px', align: 'right', render: (r) => (r.evaluated ? percent(r.bias) : '–') },
    { key: 'coverage', header: 'Abdeckung 80 %', width: '128px', align: 'right', render: (r) => (r.evaluated ? percent(r.coverage) : '–') },
  ];

  return (
    <Page area="Arbeiten" page="Artikel">
      <div className="flex flex-col gap-5 p-6">
        <Link to="/products" className="text-caption text-link">
          ← Artikel
        </Link>
        <QueryState error={query.error} isLoading={query.isLoading}>
          {d && (
            <>
              <header className="flex flex-wrap items-center gap-3">
                {d.colour && <TrafficLightBadge colour={d.colour} />}
                <h2 className="m-0 text-title font-semibold text-foreground-strong">{d.title}</h2>
                <span className="font-mono text-caption text-muted-foreground">{d.sku}</span>
                {d.is_special && <span className="text-caption text-muted-foreground">Sonderartikel</span>}
              </header>

              {d.sentence && <p className="m-0 max-w-3xl text-emphasis text-foreground-2">{d.sentence}</p>}

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border-row min-[880px]:grid-cols-4">
                {[
                  ['Bestand', formatInt(d.stock)],
                  ['Ausverkauf', d.stockout_label ?? MISSING],
                  ['Drehklasse', d.turnover_class === null ? MISSING : String(d.turnover_class)],
                  ['Trend (13 Wochen)', d.trend_percent === null ? MISSING : `${d.trend_percent.toLocaleString('de-DE')} %`],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1 bg-shell px-4 py-3">
                    <dt className="text-label uppercase text-muted-foreground">{label}</dt>
                    <dd className="m-0 font-mono text-emphasis text-foreground-strong">{value}</dd>
                  </div>
                ))}
              </dl>

              <section aria-label="Verlauf und Prognose" className="rounded-lg border border-border bg-panel p-4">
                <ForecastChart
                  title={`Absatz, Prognose und 80-%-Bereich für ${d.sku}`}
                  points={chartPoints(d.history, d.forecast)}
                  markers={d.markers.map((m) => ({ date: m.date, label: m.label }))}
                  outOfStockFrom={d.stockout_week ?? undefined}
                />
              </section>

              <div className="grid gap-4 min-[960px]:grid-cols-2">
                <section aria-label="Herkunft des Bedarfs" className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4">
                  <h3 className="m-0 text-label uppercase text-muted-foreground">Herkunft des Bedarfs (52 Wochen)</h3>
                  <p className="m-0 text-dense text-foreground-2">
                    Direkt <span className="font-mono">{formatInt(d.demand_origin.direct_units)}</span> · über Sets{' '}
                    <span className="font-mono">{formatInt(d.demand_origin.set_units)}</span> (
                    {Math.round(d.demand_origin.set_share * 100)} %)
                  </p>
                  {d.demand_origin.sets.map((set) => (
                    <p key={set.set_sku} className="m-0 text-caption text-muted-foreground">
                      <Link to={`/sets/${set.set_sku}`} className="text-link">
                        {set.set_title}
                      </Link>{' '}
                      · {set.units_per_set} je Set · {Math.round(set.share * 100)} % des Anteils
                    </p>
                  ))}
                  {d.demand_origin.channels.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-2 text-caption text-muted-foreground">
                        Kanäle <SampleBadge />
                      </span>
                      {d.demand_origin.channels.map((c) => (
                        <span key={c.channel} className="font-mono text-caption text-foreground-2">
                          {c.channel}: {Math.round(c.share * 100)} %
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section aria-label="Herleitung" className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4">
                  <h3 className="m-0 text-label uppercase text-muted-foreground">Herleitung</h3>
                  {d.derivation ? (
                    <ExplanationWaterfall
                      result={d.derivation.result}
                      steps={d.derivation.steps.map((s) => ({ key: s.key, label: s.label, delta: s.delta, value: s.value, note: s.note || undefined }))}
                    />
                  ) : (
                    <p className="m-0 text-dense text-muted-foreground">Dieser Artikel liegt nicht im Bestellplan.</p>
                  )}
                </section>
              </div>

              <section aria-label="Modelle" className="flex flex-col gap-3">
                <h3 className="m-0 text-label uppercase text-muted-foreground">Modelle</h3>
                <DataTable caption="Modelle" rows={d.models} rowKey={(r) => r.model} columns={modelColumns} />
              </section>

              <section aria-label="Journal" className="flex flex-col gap-2">
                <h3 className="m-0 text-label uppercase text-muted-foreground">Entscheidungen und Änderungen</h3>
                {d.journal.length === 0 && <p className="m-0 text-dense text-muted-foreground">Keine Einträge.</p>}
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-dense text-foreground-2">
                  {d.journal.map((j) => (
                    <li key={j.id} className="flex flex-wrap gap-x-3">
                      <span className="font-mono text-caption text-muted-foreground">{j.created_at.slice(0, 16).replace('T', ' ')}</span>
                      <span>{j.author}</span>
                      <span>{j.choice}</span>
                      {j.value !== null && <span className="font-mono">{String(j.value)}</span>}
                      {j.reason && <span className="text-muted-foreground">{j.reason}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </QueryState>
      </div>
    </Page>
  );
}
