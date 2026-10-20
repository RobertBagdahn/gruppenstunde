import { Link, useParams } from 'react-router-dom';

import { useDecideSupplier, useSupplier, useSuppliers } from '@/api/queries';
import { DataTable, type Column } from '@/components/blocks/DataTable';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { SampleDataBanner } from '@/components/shared/SampleBadge';
import { formatInt } from '@/lib/format';

const eur = (value: number) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

type Supplier = { supplier_id: string; name: string; article_count: number; value_eur: number; minimum_eur: number; status: string };

/** Third-party brand on sample data: supplier overview, drill-down, top-up to the minimum order value (BFM-01/10). */
export function SupplierOrdersPage() {
  const { supplierId } = useParams();
  return (
    <Page area="Arbeiten" page="Fremdmarke">
      <div className="flex flex-col gap-5 p-6">
        <SampleDataBanner>
          Alle Lieferanten, Artikel, Einkaufspreise und Mengen sind frei erfunden. Echte Daten kommen aus Daniels Datenbestand.
        </SampleDataBanner>
        {supplierId ? <SupplierDetailView id={supplierId} /> : <SupplierList />}
      </div>
    </Page>
  );
}

function SupplierList() {
  const query = useSuppliers();
  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Lieferant',
      width: 'minmax(0,2fr)',
      render: (s) => (
        <Link to={`/supplier-orders/${s.supplier_id}`} className="text-foreground-strong no-underline hover:underline">
          {s.name} <span className="font-mono text-caption text-muted-foreground">{s.supplier_id}</span>
        </Link>
      ),
    },
    { key: 'articles', header: 'Artikel', width: '96px', align: 'right', render: (s) => formatInt(s.article_count) },
    { key: 'value', header: 'Wert netto', width: '128px', align: 'right', render: (s) => eur(s.value_eur) },
    { key: 'status', header: 'Status', width: '160px', render: (s) => s.status },
  ];
  return (
    <QueryState error={query.error} isLoading={query.isLoading}>
      {query.data && <DataTable caption="Lieferanten" rows={query.data} rowKey={(s) => s.supplier_id} columns={columns} />}
    </QueryState>
  );
}

function SupplierDetailView({ id }: { id: string }) {
  const query = useSupplier(id);
  const decide = useDecideSupplier(id);
  const d = query.data;
  return (
    <QueryState error={query.error} isLoading={query.isLoading}>
      {d && (
        <>
          <Link to="/supplier-orders" className="text-caption text-link">
            ← Lieferanten
          </Link>
          <header className="flex flex-wrap items-baseline gap-3">
            <h2 className="m-0 text-title font-semibold text-foreground-strong">{d.name}</h2>
            <span className="font-mono text-caption text-muted-foreground">{d.supplier_id}</span>
          </header>
          <p className="m-0 text-emphasis text-foreground-2">
            Vorschlag {eur(d.value_eur)} von {eur(d.minimum_eur)} Mindestbestellwert · {d.status}
          </p>

          {d.gap_eur > 0 && d.top_up.length > 0 && (
            <section aria-label="Aufstocken" className="rounded-lg border border-border bg-panel p-4 text-dense text-foreground-2">
              <h3 className="m-0 mb-2 text-label uppercase text-muted-foreground">Aufstocken auf {eur(d.minimum_eur)}</h3>
              {d.top_up.map((t) => (
                <p key={t.sku} className="m-0">
                  <span className="font-mono">{t.sku}</span> {t.title}: +{t.extra_units} Packung ({eur(t.adds_eur)})
                </p>
              ))}
            </section>
          )}

          <DataTable
            caption="Artikel des Lieferanten"
            rows={d.articles}
            rowKey={(a) => a.sku}
            columns={[
              { key: 'title', header: 'Artikel', width: 'minmax(0,2fr)', render: (a) => `${a.title} (${a.sku})` },
              { key: 'stock', header: 'Bestand', width: '96px', align: 'right', render: (a) => formatInt(a.stock) },
              { key: 'forecast', header: 'Prognose 4 Wo.', width: '128px', align: 'right', render: (a) => formatInt(a.forecast_4_weeks) },
              { key: 'units', header: 'Packungen', width: '96px', align: 'right', render: (a) => `${formatInt(a.proposed_units)} × ${a.packaging_unit}` },
              { key: 'value', header: 'Wert', width: '112px', align: 'right', render: (a) => eur(a.value_eur) },
            ]}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => decide.mutate({ choice: 'freigeben' })}
              className="h-8 rounded-md bg-accent px-3 text-dense font-semibold text-accent-foreground"
            >
              Freigeben
            </button>
            <button type="button" onClick={() => decide.mutate({ choice: 'zurückstellen' })} className="h-8 rounded-md border border-border-strong px-3 text-dense">
              Zurückstellen
            </button>
            {d.decision && <span className="text-caption text-muted-foreground">Letzte Entscheidung: {d.decision} (Beispieldaten, Journal)</span>}
          </div>
        </>
      )}
    </QueryState>
  );
}
