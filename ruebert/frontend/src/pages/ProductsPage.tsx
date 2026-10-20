import { Link } from 'react-router-dom';

import { useProductFilters, useProducts } from '@/api/queries';
import { DataTable, type Column } from '@/components/blocks/DataTable';
import { SidebarSection } from '@/components/layout/Sidebar';
import { ListFilter, SelectField } from '@/components/layout/SidebarControls';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { TrafficLightBadge } from '@/components/shared/TrafficLightBadge';
import { formatInt } from '@/lib/format';
import { useUrlParam } from '@/lib/urlState';

type Row = {
  sku: string;
  title: string;
  brand: string | null;
  category: string | null;
  turnover_class: number | null;
  stock: number;
  colour: 'red' | 'yellow' | 'green' | 'blue' | null;
  stockout_label: string | null;
  is_special: boolean;
};

const ALL = 'all';

/** Article list: sidebar filters, search and paging in the URL, every article linked by name and SKU (UI-06). */
export function ProductsPage() {
  const [search, setSearch] = useUrlParam('q');
  const [colour, setColour] = useUrlParam('colour', ALL);
  const [brand, setBrand] = useUrlParam('brand', ALL);
  const [category, setCategory] = useUrlParam('category', ALL);
  const [page, setPage] = useUrlParam('page', '1');
  const filters = useProductFilters();
  const query = useProducts({
    search: search || undefined,
    colour: colour === ALL ? undefined : (colour as 'red'),
    brand: brand === ALL ? undefined : brand,
    category: category === ALL ? undefined : category,
    page: Number(page),
    page_size: 50,
  });
  const data = query.data;

  const columns: Column<Row>[] = [
    {
      key: 'title',
      header: 'Artikel',
      width: 'minmax(0,3fr)',
      render: (r) => (
        <Link to={`/products/${r.sku}`} className="text-foreground-strong no-underline hover:underline">
          {r.title} <span className="font-mono text-caption text-muted-foreground">{r.sku}</span>
        </Link>
      ),
    },
    { key: 'ampel', header: 'Ampel', width: '130px', render: (r) => (r.colour ? <TrafficLightBadge colour={r.colour} /> : '–') },
    { key: 'stock', header: 'Bestand', width: '96px', align: 'right', render: (r) => formatInt(r.stock) },
    { key: 'stockout', header: 'Ausverkauf', width: '150px', render: (r) => r.stockout_label ?? '–' },
  ];

  return (
    <Page
      area="Arbeiten"
      page="Artikel"
      filterTitle="Filter"
      onResetFilters={() => {
        setColour(ALL);
        setBrand(ALL);
        setCategory(ALL);
        setSearch('');
      }}
      filters={
        <>
          <SidebarSection title="Ampel">
            <ListFilter
              label="Ampel"
              value={colour}
              onChange={setColour}
              options={[
                { value: ALL, label: 'Alle' },
                { value: 'red', label: 'Rot' },
                { value: 'yellow', label: 'Gelb' },
                { value: 'green', label: 'Grün' },
                { value: 'blue', label: 'Blau' },
              ]}
            />
          </SidebarSection>
          <SidebarSection title="Marke und Kategorie">
            <SelectField
              label="Marke"
              value={brand}
              onChange={setBrand}
              options={[{ value: ALL, label: 'Alle Marken' }, ...(filters.data?.brands ?? []).map((b) => ({ value: b, label: b }))]}
            />
            <SelectField
              label="Kategorie"
              value={category}
              onChange={setCategory}
              options={[{ value: ALL, label: 'Alle Kategorien' }, ...(filters.data?.categories ?? []).map((c) => ({ value: c, label: c }))]}
            />
          </SidebarSection>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            aria-label="Suche nach Name oder SKU"
            placeholder="Name oder SKU suchen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-72 rounded-md border border-border-strong bg-panel px-3 text-dense text-foreground placeholder:text-muted-foreground"
          />
          {data && <span className="font-mono text-caption text-muted-foreground">{formatInt(data.total)} Artikel</span>}
        </div>
        <QueryState error={query.error} isLoading={query.isLoading}>
          {data && (
            <>
              <DataTable caption="Artikel" rows={data.items} rowKey={(r) => r.sku} columns={columns} />
              <nav aria-label="Seiten" className="flex items-center gap-3 text-dense">
                <button type="button" disabled={data.page <= 1} onClick={() => setPage(String(data.page - 1))} className="h-8 rounded-md border border-border-strong px-3 disabled:opacity-40">
                  Zurück
                </button>
                <span className="font-mono text-caption text-muted-foreground">
                  Seite {data.page} von {Math.max(data.total_pages, 1)}
                </span>
                <button
                  type="button"
                  disabled={data.page >= data.total_pages}
                  onClick={() => setPage(String(data.page + 1))}
                  className="h-8 rounded-md border border-border-strong px-3 disabled:opacity-40"
                >
                  Weiter
                </button>
              </nav>
            </>
          )}
        </QueryState>
      </div>
    </Page>
  );
}
