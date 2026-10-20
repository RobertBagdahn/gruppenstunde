import { useRuns } from '@/api/queries';
import { DataTable, type Column } from '@/components/blocks/DataTable';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { formatInt } from '@/lib/format';

type Run = { run_id: number; started_at: string | null; finished_at: string | null; status: string | null; sku_count: number | null; model_counts: string | null; is_current: boolean };

/** Daten & Läufe: source, last booking, last rebuild with checksum, forecast runs, comparison and orphaned entries. */
export function RunsPage() {
  const query = useRuns();
  const d = query.data;
  const runColumns: Column<Run>[] = [
    { key: 'id', header: 'Lauf', width: '96px', render: (r) => `#${r.run_id}${r.is_current ? ' · aktuell' : ''}` },
    { key: 'status', header: 'Status', width: '112px', render: (r) => r.status ?? '–' },
    { key: 'skus', header: 'Artikel', width: '96px', align: 'right', render: (r) => (r.sku_count === null ? '–' : formatInt(r.sku_count)) },
    { key: 'finished', header: 'Ende', width: 'minmax(0,1fr)', render: (r) => r.finished_at?.slice(0, 16).replace('T', ' ') ?? '–' },
  ];
  return (
    <Page area="Daten" page="Daten & Läufe">
      <div className="flex flex-col gap-6 p-6">
        <QueryState error={query.error} isLoading={query.isLoading}>
          {d && (
            <>
              {d.time_machine && (
                <p role="note" className="m-0 rounded-lg border border-warning-border bg-warning-soft p-3 text-dense text-warning-text">
                  Der Stichtag ist {d.reference_date}, heute ist {d.real_date}. Der Prototyp arbeitet mit historischen Daten.
                </p>
              )}
              <dl className="m-0 grid gap-3 text-dense text-foreground-2 min-[880px]:grid-cols-2">
                <div>
                  <dt className="text-label uppercase text-muted-foreground">Quelle</dt>
                  <dd className="m-0 break-all font-mono text-caption">{d.source_path}</dd>
                </div>
                <div>
                  <dt className="text-label uppercase text-muted-foreground">Letzte Buchung</dt>
                  <dd className="m-0 font-mono">{d.source_last_booking ?? '–'}</dd>
                </div>
                <div>
                  <dt className="text-label uppercase text-muted-foreground">Letzter Neuaufbau</dt>
                  <dd className="m-0 font-mono">{d.last_rebuild?.slice(0, 16).replace('T', ' ') ?? '–'}</dd>
                </div>
                <div>
                  <dt className="text-label uppercase text-muted-foreground">Prüfsumme</dt>
                  <dd className="m-0 break-all font-mono text-caption">{d.checksum ?? '–'}</dd>
                </div>
              </dl>
              <DataTable caption="Prognoseläufe" rows={d.runs} rowKey={(r) => String(r.run_id)} columns={runColumns} />
              {d.comparison && (
                <section aria-label="Vergleich mit v1" className="rounded-lg border border-border bg-panel p-4 text-dense text-foreground-2">
                  <h2 className="m-0 mb-2 text-label uppercase text-muted-foreground">Vergleich mit v1</h2>
                  <p className="m-0">
                    Bestand weicht bei {formatInt((d.comparison.stock_differences as unknown[]).length)} von{' '}
                    {formatInt(d.comparison.articles_compared as number)} Artikeln ab.
                  </p>
                </section>
              )}
              <section aria-label="Verwaiste Einträge" className="flex flex-col gap-2">
                <h2 className="m-0 text-label uppercase text-muted-foreground">Verwaiste Journal-Einträge</h2>
                {d.orphans.length === 0 && <p className="m-0 text-dense text-muted-foreground">Keine.</p>}
                {d.orphans.map((o) => (
                  <p key={o.id} className="m-0 text-dense text-warning-text">
                    <span className="font-mono">{o.subject}</span> · {o.reason}
                  </p>
                ))}
              </section>
            </>
          )}
        </QueryState>
      </div>
    </Page>
  );
}
