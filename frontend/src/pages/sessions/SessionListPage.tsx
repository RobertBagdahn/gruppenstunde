/**
 * SessionListPage — Listing page for GroupSessions with filters.
 * URL-driven filter state for bookmarkability.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useSessions, useDeleteSession } from '@/api/sessions';
import ContentCard from '@/components/content/ContentCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ListPageHero from '@/components/shared/ListPageHero';
import EmptyState from '@/components/shared/EmptyState';
import FilterSelect from '@/components/shared/FilterSelect';
import SortSelect from '@/components/shared/SortSelect';
import { toast } from 'sonner';
import {
  DIFFICULTY_OPTIONS,
} from '@/schemas/content';
import {
  SESSION_TYPE_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  type GroupSessionFilter,
} from '@/schemas/session';

/* ------------------------------------------------------------------ */
/*  Sort options                                                       */
/* ------------------------------------------------------------------ */
const SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'popular', label: 'Beliebteste' },
  { value: 'alphabetical', label: 'Alphabetisch (A-Z)' },
] as const;

/* ------------------------------------------------------------------ */
/*  URL <-> Filter sync                                                */
/* ------------------------------------------------------------------ */

function filtersFromParams(params: URLSearchParams): Partial<GroupSessionFilter> {
  const filters: Partial<GroupSessionFilter> = {
    page: 1,
    page_size: 20,
  };
  const q = params.get('q');
  if (q) filters.q = q;
  const sessionType = params.get('session_type');
  if (sessionType) filters.session_type = sessionType;
  const locationType = params.get('location_type');
  if (locationType) filters.location_type = locationType;
  const difficulty = params.get('difficulty');
  if (difficulty) filters.difficulty = difficulty;
  const sort = params.get('sort');
  if (sort) filters.sort = sort;
  const page = params.get('page');
  if (page) filters.page = Number(page);
  return filters;
}

function filtersToParams(filters: Partial<GroupSessionFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.session_type) params.set('session_type', filters.session_type);
  if (filters.location_type) params.set('location_type', filters.location_type);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function SessionListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = filtersFromParams(searchParams);
  const { data, isLoading, error, refetch } = useSessions(filters);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const deleteSession = useDeleteSession(deleteTarget?.id ?? 0);

  useEffect(() => {
    document.title = 'Gruppenstunden – Inspi';
  }, []);

  const updateFilter = (key: keyof GroupSessionFilter, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined, page: 1 };
    setSearchParams(filtersToParams(newFilters), { replace: true });
  };

  const setPage = (page: number) => {
    const newFilters = { ...filters, page };
    setSearchParams(filtersToParams(newFilters), { replace: true });
  };

  return (
    <EntityLinkContext.Provider value="list">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <ListPageHero
        title="Gruppenstunden"
        description="Entdecke Ideen und Anleitungen fuer eure naechste Gruppenstunde. Filtern nach Typ, Ort und Schwierigkeit."
        icon="groups"
        gradientClasses="bg-gradient-to-br from-emerald-500 to-green-600"
        totalCount={data?.total}
        countLabel="Gruppenstunde"
      />

      {/* Search + Filters + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Gruppenstunde suchen..."
            value={filters.q ?? ''}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <FilterSelect
          label="Typ"
          value={filters.session_type ?? ''}
          options={SESSION_TYPE_OPTIONS}
          onChange={(v) => updateFilter('session_type', v)}
        />
        <FilterSelect
          label="Ort"
          value={filters.location_type ?? ''}
          options={LOCATION_TYPE_OPTIONS}
          onChange={(v) => updateFilter('location_type', v)}
        />
        <FilterSelect
          label="Schwierigkeit"
          value={filters.difficulty ?? ''}
          options={DIFFICULTY_OPTIONS}
          onChange={(v) => updateFilter('difficulty', v)}
        />
        <SortSelect
          value={filters.sort ?? 'newest'}
          onChange={(v) => updateFilter('sort', v)}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-muted h-72" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && <ErrorDisplay error={error} onRetry={() => refetch()} />}

      {/* Results */}
      {data && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {data.total} Gruppenstunde{data.total !== 1 ? 'n' : ''} gefunden
            </p>
          </div>

          {data.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {data.items.map((session) => (
                <ContentCard
                  key={session.id}
                  content={session}
                  href={`/sessions/${session.slug}`}
                  typeLabel={
                    SESSION_TYPE_OPTIONS.find((t) => t.value === session.session_type)?.label
                  }
                  typeIcon="groups"
                  typeBadgeColor="text-emerald-600"
                  canEdit={session.can_edit}
                  canDelete={session.can_delete}
                  onEdit={() => navigate(`/sessions/${session.slug}`)}
                  onDelete={() => setDeleteTarget({ id: session.id, title: session.title })}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search_off"
              title="Keine Gruppenstunden gefunden"
              description="Versuche andere Filtereinstellungen."
              ctaLabel="Gruppenstunde erstellen"
              ctaHref="/create"
            />
          )}

          {/* Pagination */}
          <Pagination
            currentPage={data.page}
            totalPages={data.total_pages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => {
          deleteSession.mutate(undefined, {
            onSuccess: () => {
              toast.success('Gruppenstunde gelöscht');
              setDeleteTarget(null);
              refetch();
            },
            onError: (err) => {
              toast.error('Fehler beim Löschen', { description: err.message });
              setDeleteTarget(null);
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
        title={`"${deleteTarget?.title}" löschen?`}
        description="Die Gruppenstunde wird gelöscht und ist nicht mehr sichtbar."
        confirmLabel="Löschen"
        loading={deleteSession.isPending}
      />
    </div>
    </EntityLinkContext.Provider>
  );
}
