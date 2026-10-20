import { Link } from 'react-router-dom';

import { useForecastQuality } from '@/api/queries';
import { DataTable, type Column } from '@/components/blocks/DataTable';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { formatInt, formatPercent } from '@/lib/format';

type Model = { model: string; articles_evaluated: number; articles_not_evaluated: number; wape_mean: number | null; bias_mean: number | null; coverage_mean: number | null };
type Worst = { sku: string; title: string; model: string; wape: number };

const percent = (value: number | null) => (value === null ? 'nicht bewertet' : formatPercent(value));

/** Forecast quality of the last run per model, plus the articles with the highest WAPE (analysis-views). */
export function QualityPage() {
  const query = useForecastQuality();
  const modelColumns: Column<Model>[] = [
    { key: 'model', header: 'Modell', width: 'minmax(0,2fr)', render: (m) => m.model },
    { key: 'wape', header: 'WAPE Ø', width: '112px', align: 'right', render: (m) => percent(m.wape_mean) },
    { key: 'bias', header: 'Bias Ø', width: '112px', align: 'right', render: (m) => percent(m.bias_mean) },
    { key: 'coverage', header: 'Abdeckung 80 %', width: '144px', align: 'right', render: (m) => percent(m.coverage_mean) },
    { key: 'n', header: 'Artikel bewertet', width: '144px', align: 'right', render: (m) => `${formatInt(m.articles_evaluated)} (${formatInt(m.articles_not_evaluated)} nicht)` },
  ];
  const worstColumns: Column<Worst>[] = [
    { key: 'title', header: 'Artikel', width: 'minmax(0,2fr)', render: (w) => <Link to={`/products/${w.sku}`} className="text-link">{w.title} <span className="font-mono text-caption">{w.sku}</span></Link> },
    { key: 'wape', header: 'WAPE', width: '96px', align: 'right', render: (w) => percent(w.wape) },
  ];
  return (
    <Page area="Analyse" page="Prognosegüte">
      <div className="flex flex-col gap-6 p-6">
        <QueryState error={query.error} isLoading={query.isLoading}>
          {query.data && (
            <>
              <DataTable caption="Modelle" rows={query.data.models} rowKey={(m) => m.model} columns={modelColumns} />
              <section aria-label="Schlechteste Artikel" className="flex flex-col gap-2">
                <h2 className="m-0 text-label uppercase text-muted-foreground">Schlechteste Artikel (WAPE, gewähltes Modell)</h2>
                <DataTable caption="Schlechteste Artikel" rows={query.data.worst} rowKey={(w) => w.sku} columns={worstColumns} />
              </section>
            </>
          )}
        </QueryState>
      </div>
    </Page>
  );
}
