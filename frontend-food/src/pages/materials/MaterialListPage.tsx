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
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import ErrorDisplay from '@/components/ErrorDisplay';
import MaterialFormDialog from '@/components/material/MaterialFormDialog';
import { SkeletonCardGrid } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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

  const { data, isPending, error, refetch } = useMaterials({
    q: q || undefined,
    material_category: category || undefined,
    is_consumable: kind === 'all' ? undefined : kind === 'consumable',
    page,
    page_size: 24,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <PageHeader
        title="Material"
        description="Geräte und Verbrauchsmaterial, die Rezepte brauchen – vom Backofen bis zum Pappteller."
        area="neutral"
        icon="inventory_2"
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

      <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="Filter">
        {KIND_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => patch({ kind: opt.value === 'all' ? undefined : opt.value })}
            aria-pressed={kind === opt.value}
            className={cn(
              'press rounded-full px-3.5 py-1.5 text-body font-medium border transition-colors',
              kind === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted',
            )}
          >
            {opt.label}
          </button>
        ))}
        <select
          aria-label="Kategorie"
          value={category}
          onChange={(e) => patch({ category: e.target.value || undefined })}
          className="h-9 rounded-lg border border-input bg-card px-3 text-body"
        >
          <option value="">Alle Kategorien</option>
          {MATERIAL_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {currentUser && (
          <Button type="button" size="sm" className="sm:hidden ml-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Neues Material
          </Button>
        )}
      </div>

      {error ? (
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <SkeletonCardGrid />
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
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="material-list">
            {data.items.map((material) => (
              <li key={material.id}>
                <Link
                  to={`/material/${material.slug}`}
                  className="card-hover block rounded-xl bg-card p-4 shadow-card h-full"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-emphasis font-semibold [overflow-wrap:anywhere]">{material.name}</h2>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-caption font-medium',
                        material.is_consumable ? 'bg-spice-soft text-spice-foreground' : 'bg-primary-soft text-primary',
                      )}
                    >
                      {material.is_consumable ? 'Verbrauch' : 'Gerät'}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {CATEGORY_LABELS[material.material_category] ?? material.material_category}
                  </p>
                  {material.price_per_piece !== null && (
                    <p className="mt-2 text-body text-muted-foreground tabular-nums">
                      {formatEuro(material.price_per_piece)} pro Stück
                    </p>
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
