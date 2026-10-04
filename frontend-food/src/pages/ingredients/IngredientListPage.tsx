import { SkeletonCardGrid } from '@/components/ui/skeleton';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { useIngredients, useDeleteIngredient, ApiDeleteError } from '@/api/supplies';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import ActiveFiltersHint from '@/components/shared/ActiveFiltersHint';
import IngredientCard from '@/components/ingredient/IngredientCard';
import IngredientFilterSidebar from '@/components/ingredient/IngredientFilterSidebar';
import EmptyState from '@/components/shared/EmptyState';
import { IngredientListStateSchema, type INGREDIENT_SORT_VALUES } from '@/schemas/listState';
import { usePersistedListState, useDebouncedSearchInput } from '@/hooks/usePersistedListState';
import { parseIngredientStatus } from '@/lib/ingredientStatus';
import { Icon } from '@/components/ui/icon';

const SORT_OPTIONS: { value: (typeof INGREDIENT_SORT_VALUES)[number]; label: string }[] = [
  { value: 'relevance', label: 'Relevanz' },
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Älteste' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
];

const INGREDIENT_LIST_DEFAULTS = { sort: 'relevance', page: 1 } as const;
// The search text stays URL-only: restoring it silently led to empty lists.
const PERSIST_EXCLUDE = ['q', 'page'] as const;
const COUNT_EXCLUDE = ['page'] as const;

export default function IngredientListPage() {
  const navigate = useNavigate();
  const { state, patch, reset, activeCount, restored } = usePersistedListState({
    key: 'ingredients',
    schema: IngredientListStateSchema,
    defaults: INGREDIENT_LIST_DEFAULTS,
    persistExclude: PERSIST_EXCLUDE,
    countExclude: COUNT_EXCLUDE,
  });
  const { q: name, retail_section: retailSection, status, origin, sort, page } = state;

  const { data, isPending: isLoading, error, refetch, isPlaceholderData } = useIngredients({
    page,
    page_size: 20,
    name: name || undefined,
    retail_section: retailSection,
    status,
    origin,
    sort,
  }, { enabled: restored });

  const deleteIngredient = useDeleteIngredient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const search = useDebouncedSearchInput(name ?? '', (value) => {
    patch({ q: value || undefined, page: undefined }, { replace: true });
  });

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    if (key === 'retail_section') patch({ retail_section: value as number | undefined, page: undefined });
    else if (key === 'status') patch({ status: parseIngredientStatus(String(value ?? '')), page: undefined });
    else if (key === 'origin') patch({ origin: value === 'mine' ? 'mine' : undefined, page: undefined });
  }, [patch]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      {/* Hero */}
      <PageHeader
        title="Zutatendatenbank"
        description="Verwalte alle Zutaten mit Nährwerten, Preisen und Nutri-Score."
        area="ingredients"
        icon="egg_alt"
        count={data?.total}
        countLoading={isLoading || !restored}
        countLabel={{ one: 'Zutat', other: 'Zutaten' }}
      />

      {/* Search Bar */}
      <ListPageSearchBar
        placeholder="Zutat suchen..."
        value={search.input}
        onChange={search.setInput}
        onSubmit={search.submit}
        createLabel="Neue Zutat"
        createHref="/ingredients/new"
      />

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Filter Sidebar */}
        <IngredientFilterSidebar
          filters={{ retail_section: retailSection, status, origin }}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Results */}
        <div className="flex-1">
          <ActiveFiltersHint activeCount={activeCount} onReset={handleReset} />
          {/* Sort */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/ingredients/statistics')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-foreground text-body font-medium hover:bg-muted transition-all"
              >
                <Icon name="analytics" size={16} />
                Statistiken
              </button>
              <button
                onClick={() => navigate('/ingredients/new')}
                className="sm:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-body font-medium hover:bg-primary/90 transition-all shadow-soft"
              >
                <Icon name="add_circle" size={16} />
                Neue Zutat
              </button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Icon name="sort" size={20} className="text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => patch({ sort: SORT_OPTIONS.find((opt) => opt.value === e.target.value)?.value, page: undefined })}
                className="px-3 py-1.5 rounded-lg border border-border text-body bg-card text-foreground focus:ring-2 focus:ring-ring/30 focus:border-primary focus:outline-none font-medium shadow-card transition-all"
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
          ) : isLoading || !restored ? (
            <SkeletonCardGrid count={8} withImage={false} label="Zutaten werden geladen" />
          ) : data?.items.length === 0 ? (
            activeCount > 0 ? (
              <EmptyState
                icon="egg_alt"
                title="Keine Zutaten gefunden"
                description="Mit diesen Suchbegriffen und Filtern gibt es keine Treffer."
                ctaLabel="Filter zurücksetzen"
                onCtaClick={handleReset}
              />
            ) : (
              <EmptyState
                icon="egg_alt"
                title="Noch keine Zutaten"
                description="Erstelle deine erste Zutat für die Datenbank."
                ctaLabel="Erste Zutat erstellen"
                ctaHref="/ingredients/new"
              />
            )
          ) : (
            <div
              aria-busy={isPlaceholderData}
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {data?.items.map((ingredient) => (
                <IngredientCard
                  key={ingredient.id}
                  ingredient={ingredient}
                  onDelete={ingredient.can_delete ? () => setDeleteTarget(ingredient.slug) : undefined}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={data?.page ?? 1}
            totalPages={data?.total_pages ?? 1}
            onPageChange={(nextPage) => patch({ page: nextPage })}
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
              notify.success('Zutat gelöscht');
              setDeleteTarget(null);
              refetch();
            },
            onError: (err: Error) => {
              setDeleteTarget(null);
              if (err instanceof ApiDeleteError && err.status === 409 && err.recipes.length > 0) {
                const recipeNames = err.recipes.map((r) => r.title).join(', ');
                notify.error('Zutat wird noch verwendet', {
                  description: `Entferne die Zutat zuerst aus folgenden Rezepten: ${recipeNames}`,
                });
              } else {
                notify.error('Zutat konnte nicht gelöscht werden', { error: err });
              }
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
        title="Zutat löschen?"
        description="Die Zutat und alle zugehörigen Portionen und Preise werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteIngredient.isPending}
      />
    </div>
  );
}
