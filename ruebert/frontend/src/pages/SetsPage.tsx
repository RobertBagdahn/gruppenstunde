import { Link, useParams } from 'react-router-dom';

import { useSet, useSets } from '@/api/queries';
import { DataTable, type Column } from '@/components/blocks/DataTable';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { formatInt } from '@/lib/format';

type SetRow = { set_sku: string; title: string; components: number; units_bound_52_weeks: number };

/** Sets and bundles, ranked by the component units they bind; a set is planned through its components (BEM-08). */
export function SetsPage() {
  const { setSku } = useParams();
  return (
    <Page area="Analyse" page="Sets & Bundles">
      <div className="flex flex-col gap-5 p-6">{setSku ? <SetDetailView sku={setSku} /> : <SetList />}</div>
    </Page>
  );
}

function SetList() {
  const query = useSets({ page_size: 200 });
  const columns: Column<SetRow>[] = [
    { key: 'title', header: 'Set', width: 'minmax(0,2fr)', render: (s) => <Link to={`/sets/${s.set_sku}`} className="text-foreground-strong no-underline hover:underline">{s.title} <span className="font-mono text-caption text-muted-foreground">{s.set_sku}</span></Link> },
    { key: 'components', header: 'Komponenten', width: '112px', align: 'right', render: (s) => formatInt(s.components) },
    { key: 'bound', header: 'Gebundene Einheiten (52 Wo.)', width: '192px', align: 'right', render: (s) => formatInt(s.units_bound_52_weeks) },
  ];
  return (
    <QueryState error={query.error} isLoading={query.isLoading}>
      {query.data && <DataTable caption="Sets" rows={query.data.items} rowKey={(s) => s.set_sku} columns={columns} />}
    </QueryState>
  );
}

function SetDetailView({ sku }: { sku: string }) {
  const query = useSet(sku);
  const d = query.data;
  return (
    <QueryState error={query.error} isLoading={query.isLoading}>
      {d && (
        <>
          <Link to="/sets" className="text-caption text-link">
            ← Sets & Bundles
          </Link>
          <h2 className="m-0 text-title font-semibold text-foreground-strong">
            {d.title} <span className="font-mono text-caption text-muted-foreground">{d.set_sku}</span>
          </h2>
          <DataTable
            caption="Komponenten"
            rows={d.components_detail}
            rowKey={(c) => c.sku}
            columns={[
              { key: 'title', header: 'Komponente', width: 'minmax(0,2fr)', render: (c) => <Link to={`/products/${c.sku}`} className="text-link">{c.title} <span className="font-mono text-caption">{c.sku}</span></Link> },
              { key: 'qty', header: 'Menge im Set', width: '112px', align: 'right', render: (c) => formatInt(c.quantity) },
              { key: 'share', header: 'Anteil aus Sets', width: '128px', align: 'right', render: (c) => `${Math.round(c.share_from_set * 100)} %` },
            ]}
          />
        </>
      )}
    </QueryState>
  );
}
