import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import { useIngredients, useDeleteIngredient } from '@/api/supplies';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import ListPageHero from '@/components/shared/ListPageHero';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import IngredientCard from '@/components/ingredient/IngredientCard';
import IngredientFilterSidebar from '@/components/ingredient/IngredientFilterSidebar';
import EmptyState from '@/components/shared/EmptyState';
import UnauthGate from '@/components/shared/UnauthGate';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Aelteste' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
];

export default function IngredientListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: user } = useCurrentUser();

  // URL-driven state
  const [name, setName] = useState(searchParams.get('name') || '');
  const [retailSection, setRetailSection] = useState<number | undefined>(
    searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : undefined,
  );
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (retailSection) params.set('retail_section', String(retailSection));
    if (status) params.set('status', status);
    if (origin && origin !== 'all') params.set('origin', origin);
    if (sort && sort !== 'newest') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [name, retailSection, status, origin, sort, page, setSearchParams]);

  const { data, isLoading, error, refetch } = useIngredients({
    page,
    page_size: 20,
    name: name || undefined,
    retail_section: retailSection,
    status: status || undefined,
    origin: origin || undefined,
    sort: sort || undefined,
  });

  const deleteIngredient = useDeleteIngredient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Search input with debounce
  const [searchInput, setSearchInput] = useState(name);
  useEffect(() => {
    const timer = setTimeout(() => {
      setName(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    if (key === 'retail_section') setRetailSection(value as number | undefined);
    else if (key === 'status') setStatus((value as string) ?? '');
    else if (key === 'origin') setOrigin((value as string) ?? '');
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setRetailSection(undefined);
    setStatus('');
    setOrigin('');
    setName('');
    setSearchInput('');
    setSort('newest');
    setPage(1);
  }, []);

  if (!user) {
    return (
      <UnauthGate
        title="Zutatendatenbank"
        description="Melde dich an, um die Zutatendatenbank zu verwalten."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      {/* Hero */}
      <ListPageHero
        title="Zutatendatenbank"
        description="Verwalte alle Zutaten mit Nährwerten, Preisen und Nutri-Score."
        icon="egg_alt"
        gradientClasses="gradient-primary"
        totalCount={data?.total}
        countLabel="Zutat"
        countIcon="egg_alt"
      />

      {/* Search Bar */}
      <ListPageSearchBar
        placeholder="Zutat suchen..."
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={() => { setName(searchInput); setPage(1); }}
        createLabel="Neue Zutat"
        createHref="/ingredients/new"
        gradientClasses="from-primary/5 via-primary/10 to-primary/5"
      />

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Filter Sidebar */}
        <IngredientFilterSidebar
          filters={{ retail_section: retailSection, status: status || undefined, origin: origin || undefined }}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Results */}
        <div className="flex-1">
          {/* Sort */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/ingredients/new')}
              className="sm:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-soft"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Neue Zutat
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="material-symbols-outlined text-muted-foreground text-[18px]">sort</span>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-xl border border-border text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none font-medium shadow-sm transition-all"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <ErrorDisplay error={error} onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-muted/40 animate-pulse h-40"
                />
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <EmptyState
              icon="egg_alt"
              title="Keine Zutaten gefunden"
              description={
                name || retailSection || status
                  ? 'Versuch es mit anderen Suchbegriffen oder Filtern.'
                  : 'Erstelle deine erste Zutat für die Datenbank.'
              }
              ctaLabel="Erste Zutat erstellen"
              ctaHref="/ingredients/new"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data?.items.map((ingredient) => (
                <IngredientCard
                  key={ingredient.id}
                  ingredient={ingredient}
                  onDelete={() => setDeleteTarget(ingredient.slug)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={data?.page ?? 1}
            totalPages={data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={() => {
          if (deleteTarget === null) return;
          deleteIngredient.mutate(deleteTarget, {
            onSuccess: () => {
              toast.success('Zutat geloescht');
              setDeleteTarget(null);
              refetch();
            },
            onError: (err) => {
              toast.error('Fehler beim Loeschen', { description: err.message });
              setDeleteTarget(null);
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
        title="Zutat loeschen?"
        description="Die Zutat und alle zugehoerigen Portionen und Preise werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deleteIngredient.isPending}
      />
    </div>
  );
}
