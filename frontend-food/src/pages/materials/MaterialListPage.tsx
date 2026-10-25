/**
 * MaterialListPage — directory of devices and consumables.
 *
 * Search, consumable filter, category and page live in the URL.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useMaterials } from '@/api/materials';
import PageHeader from '@/components/shared/PageHeader';
import AreaTabs from '@/components/shared/AreaTabs';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import ErrorDisplay from '@/components/ErrorDisplay';
import MaterialFormDialog from '@/components/material/MaterialFormDialog';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { MATERIAL_CATEGORY_OPTIONS } from '@/schemas/supply';
import { formatEuro } from '@/lib/materialAmount';

type KindFilter = 'all' | 'consumable' | 'device';

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'device', label: 'Geräte' },
  { value: 'consumable', label: 'Verbrauchsmaterial' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  MATERIAL_CATEGORY_OPTIONS.map((opt) => [opt.value, opt.label]),
);

/** Filter chip on white ground: active = petrol border and text, never a filled surface. */
const CHIP_CLASS =
  'press flex h-11 md:h-9 items-center gap-2 rounded-full border bg-card px-4 text-body font-semibold transition-colors duration-200';

export default function MaterialListPage() {
  const [params, setParams] = useSearchParams();
  const { data: currentUser } = useCurrentUser();
  const [createOpen, setCreateOpen] = useState(false);

  const q = params.get('q') ?? '';
  const kind: KindFilter = params.get('kind') === 'consumable' ? 'consumable' : params.get('kind') === 'device' ? 'device' : 'all';
  const category = params.get('category') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [searchInput, setSearchInput] = useState(q);

  const patch = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const { data, isPending, error, refetch, isPlaceholderData } = useMaterials({
    q: q || undefined,
    material_category: category || undefined,
    is_consumable: kind === 'all' ? undefined : kind === 'consumable',
    page,
    page_size: 24,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <AreaTabs
        label="Zutaten und Material"
        tabs={[
          { label: 'Zutaten', to: '/ingredients', activePrefixes: ['/ingredients'] },
          { label: 'Material', to: '/material', activePrefixes: ['/material', '/material-list'] },
        ]}
      />
      <PageHeader
        title="Material"
        description="Geräte und Verbrauchsmaterial, die Rezepte brauchen – vom Backofen bis zum Pappteller."
        breadcrumbs={[{ label: 'Startseite', to: '/' }, { label: 'Material' }]}
        count={data?.total}
        countLoading={isPending}
        countLabel={{ one: 'Material', other: 'Materialien' }}
      >
        <ListPageSearchBar
          placeholder="Material suchen..."
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => patch({ q: searchInput.trim() || undefined })}
          createLabel={currentUser ? 'Neues Material' : undefined}
          onCreateClick={currentUser ? () => setCreateOpen(true) : undefined}
        />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter">
        {KIND_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => patch({ kind: opt.value === 'all' ? undefined : opt.value })}
            aria-pressed={kind === opt.value}
            className={cn(
              CHIP_CLASS,
              kind === opt.value ? 'border-primary text-primary-dark' : 'border-border text-foreground hover:border-primary-soft-border',
            )}
          >
            {opt.label}
          </button>
        ))}
        <select
          aria-label="Kategorie"
          value={category}
          onChange={(e) => patch({ category: e.target.value || undefined })}
          className="h-11 md:h-9 rounded-lg border border-border bg-card px-3 text-emphasis md:text-body shadow-soft focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">Alle Kategorien</option>
          {MATERIAL_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {currentUser && (
          <Button type="button" className="sm:hidden ml-auto" onClick={() => setCreateOpen(true)}>
            <Icon name="add_circle" size={16} />
            Neues Material
          </Button>
        )}
      </div>

      {error ? (
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <SkeletonTableRows rows={8} columns={3} label="Material wird geladen" />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title="Kein Material gefunden"
          description="Passe die Suche oder die Filter an – oder lege neues Material an."
          ctaLabel={currentUser ? 'Neues Material' : undefined}
          onCtaClick={currentUser ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <>
          <ul
            aria-busy={isPlaceholderData}
            className={cn('stagger flex flex-col gap-2 transition-opacity', isPlaceholderData && 'opacity-60')}
            data-testid="material-list"
          >
            {data.items.map((material) => (
              <li key={material.id}>
                <Link
                  to={`/material/${material.slug}`}
                  className="card-hover group flex min-h-11 items-center gap-3 rounded-xl bg-card px-3 py-3 shadow-card md:px-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon name="inventory_2" size={20} />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-emphasis font-semibold text-foreground [overflow-wrap:anywhere] group-hover:text-primary-dark transition-colors">
                      {material.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 font-semibold',
                          material.is_consumable ? 'bg-muted text-foreground' : 'bg-primary-soft text-primary-dark',
                        )}
                      >
                        {material.is_consumable ? 'Verbrauch' : 'Gerät'}
                      </span>
                      <span>{CATEGORY_LABELS[material.material_category] ?? material.material_category}</span>
                    </span>
                  </span>
                  {material.price_per_piece !== null && (
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block text-body font-semibold text-foreground">
                        {formatEuro(material.price_per_piece)}
                      </span>
                      <span className="block text-caption text-muted-foreground">pro Stück</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            className="mt-6"
            currentPage={data.page}
            totalPages={data.total_pages}
            onPageChange={(next) => patch({ page: next > 1 ? String(next) : undefined })}
          />
        </>
      )}

      {createOpen && <MaterialFormDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  );
}
