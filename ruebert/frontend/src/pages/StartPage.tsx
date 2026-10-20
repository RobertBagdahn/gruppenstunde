import { useEffect, useMemo, useState } from 'react';

import { useDecideTraffic, useProduct, useTrafficLight } from '@/api/queries';
import { KpiStrip } from '@/components/blocks/KpiStrip';
import { QueueItem, type QueueKind } from '@/components/blocks/QueueItem';
import { RecommendationPanel } from '@/components/blocks/RecommendationPanel';
import { ExplanationWaterfall } from '@/components/charts/ExplanationWaterfall';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { TrafficLightBadge } from '@/components/shared/TrafficLightBadge';
import { formatInt } from '@/lib/format';
import { chartPoints } from '@/lib/productChart';

/** Start page "Entscheidungen" in the triage pattern: queue left, the selected suggestion right (Design.md). */
export function StartPage() {
  const query = useTrafficLight();
  const data = query.data;
  const queue = useMemo(() => (data ? data.queue.filter((i) => !i.decision) : []), [data]);
  const [chosen, setChosen] = useState<string | null>(null);
  const selected = queue.find((i) => i.sku === chosen) ?? queue[0] ?? null;
  const detail = useProduct(selected?.sku ?? null);
  const decide = useDecideTraffic(selected?.sku ?? '');

  // J/K move through the queue, Enter accepts, Z postpones (Design.md, triage pattern).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (!queue.length || !selected) return;
      const index = queue.findIndex((i) => i.sku === selected.sku);
      if (event.key === 'j') setChosen(queue[Math.min(index + 1, queue.length - 1)].sku);
      if (event.key === 'k') setChosen(queue[Math.max(index - 1, 0)].sku);
      if (event.key === 'Enter') decide.mutate({ choice: 'annehmen' });
      if (event.key === 'z') decide.mutate({ choice: 'zurückstellen' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queue, selected, decide]);

  return (
    <Page area="Arbeiten" page="Entscheidungen">
      <div className="flex flex-col gap-5 p-6">
        <QueryState error={query.error} isLoading={query.isLoading}>
          {data && (
            <>
              <KpiStrip
                items={(['red', 'yellow', 'green', 'blue'] as const).map((colour) => ({ colour, count: data.counts[colour] ?? 0 }))}
              />
              <div className="grid gap-4 min-[960px]:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
                <section aria-label="Offene Entscheidungen" className="flex flex-col overflow-hidden rounded-lg border border-border bg-sunken">
                  <header className="flex items-center justify-between border-b border-border px-4 py-2 text-label uppercase text-muted-foreground">
                    <span>Offen</span>
                    <span className="font-mono">{formatInt(queue.length)}</span>
                  </header>
                  {queue.length === 0 && <p className="px-4 py-6 text-dense text-muted-foreground">Keine offenen Entscheidungen.</p>}
                  {queue.map((item) => (
                    <QueueItem
                      key={item.sku}
                      colour={item.colour}
                      title={item.title}
                      sku={item.sku}
                      kind={kindOf(item)}
                      context={item.stockout_label === 'reicht über den Horizont' ? undefined : `Ausverkauf ${item.stockout_label}`}
                      quantity={item.suggested_quantity ?? undefined}
                      due={item.recommendation?.replace(/ · .*/, '') ?? undefined}
                      selected={selected?.sku === item.sku}
                      onSelect={() => setChosen(item.sku)}
                    />
                  ))}
                </section>

                <section aria-label="Details" className="flex min-w-0 flex-col gap-4">
                  {selected && (
                    <>
                      <header className="flex flex-wrap items-center gap-3">
                        <TrafficLightBadge colour={selected.colour} />
                        <h2 className="m-0 text-title font-semibold text-foreground-strong">{selected.title}</h2>
                        <span className="font-mono text-caption text-muted-foreground">{selected.sku}</span>
                      </header>
                      <RecommendationPanel
                        title={selected.recommendation ?? 'Keine Bestellung nötig'}
                        reason={`Bestand ${formatInt(selected.stock)} · Ausverkauf ${selected.stockout_label}`}
                        actions={[
                          { label: 'Übernehmen', shortcut: '↵', primary: true, onClick: () => decide.mutate({ choice: 'annehmen' }) },
                          { label: 'Zurückstellen', shortcut: 'Z', onClick: () => decide.mutate({ choice: 'zurückstellen' }) },
                        ]}
                      />
                      <QueryState error={detail.error} isLoading={detail.isLoading}>
                        {detail.data && (
                          <>
                            <div className="rounded-lg border border-border bg-panel p-4">
                              <ForecastChart
                                title={`Absatz, Prognose und 80-%-Bereich für ${detail.data.sku}`}
                                points={chartPoints(detail.data.history, detail.data.forecast)}
                                markers={detail.data.markers.map((m) => ({ date: m.date, label: m.label }))}
                                outOfStockFrom={detail.data.stockout_week ?? undefined}
                              />
                            </div>
                            {detail.data.derivation && (
                              <div className="rounded-lg border border-border bg-panel p-4">
                                <ExplanationWaterfall
                                  result={detail.data.derivation.result}
                                  steps={detail.data.derivation.steps.map((s) => ({ key: s.key, label: s.label, delta: s.delta, value: s.value, note: s.note || undefined }))}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </QueryState>
                    </>
                  )}
                </section>
              </div>

              {data.special.length > 0 && (
                <section aria-label="Sonderartikel" className="rounded-lg border border-border bg-panel p-4">
                  <h3 className="m-0 mb-2 text-label uppercase text-muted-foreground">Sonderartikel</h3>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0 text-dense text-foreground-2">
                    {data.special.map((item) => (
                      <li key={item.sku} className="flex items-center gap-3">
                        <span className="font-mono">{item.sku}</span>
                        <span>{item.title}</span>
                        <span className="ml-auto text-muted-foreground">nicht Teil der Eigenmarke-Bestellung</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </QueryState>
      </div>
    </Page>
  );
}

/** Queue type of an item: a decision on a recommended order, or a case; the API only sends traffic-light items here. */
function kindOf(item: { recommendation?: string | null }): QueueKind {
  return item.recommendation ? 'Bestellen' : 'Fall';
}
