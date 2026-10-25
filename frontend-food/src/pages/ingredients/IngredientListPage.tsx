import { SkeletonTableRows } from '@/components/ui/skeleton';
import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { useIngredients, useDeleteIngredient, ApiDeleteError } from '@/api/supplies';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import AreaTabs from '@/components/shared/AreaTabs';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import ActiveFiltersHint from '@/components/shared/ActiveFiltersHint';
import IngredientTableRow from '@/components/ingredient/IngredientTableRow';
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
      <AreaTabs
        label="Zutaten und Material"
        tabs={[
          { label: 'Zutaten', to: '/ingredients', activePrefixes: ['/ingredients'] },
          { label: 'Material', to: '/material', activePrefixes: ['/material', '/material-list'] },
        ]}
      />
      <PageHeader
        title="Zutaten"
        description="Nährwerte, Preise und Portionen für jede Zutat."
        breadcrumbs={[{ label: 'Startseite', to: '/' }, { label: 'Zutaten' }]}
        count={data?.total}
        countLoading={isLoading || !restored}
        countLabel={{ one: 'Eintrag', other: 'Einträge' }}
      >
        <ListPageSearchBar
          placeholder="Zutat suchen..."
          value={search.input}
          onChange={search.setInput}
          onSubmit={search.submit}
          createLabel="Neue Zutat"
          createHref="/ingredients/new"
        />
        <IngredientFilterSidebar
          filters={{ retail_section: retailSection, status, origin }}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />
      </PageHeader>

      <div className="flex-1">
        <ActiveFiltersHint activeCount={activeCount} onReset={handleReset} />
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Link
            to="/ingredients/new"
            className="press sm:hidden flex h-11 items-center gap-1.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-body font-semibold transition-colors"
          >
            <Icon name="add_circle" size={16} />
            Neue Zutat
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 ml-auto min-w-0">
            <button
              type="button"
              onClick={() => navigate('/ingredients/statistics')}
              className="press hidden sm:flex h-11 md:h-9 items-center gap-1.5 rounded-lg bg-card px-4 text-body font-semibold text-foreground shadow-soft hover:text-primary-dark transition-colors"
            >
              <Icon name="analytics" size={16} />
              Statistiken
            </button>
            <label className="flex h-11 md:h-9 items-center gap-2 rounded-lg bg-card pl-3 pr-1 shadow-soft min-w-0">
              <Icon name="sort" size={20} className="text-muted-foreground" />
              <span className="sr-only">Sortieren</span>
              <select
                value={sort}
                onChange={(e) => patch({ sort: SORT_OPTIONS.find((opt) => opt.value === e.target.value)?.value, page: undefined })}
                className="min-w-0 h-11 md:h-9 rounded-lg border-0 bg-transparent px-2 text-body font-semibold focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <ErrorDisplay error={error} onRetry={() => refetch()} />
        ) : isLoading || !restored ? (
          <SkeletonTableRows rows={8} columns={3} label="Zutaten werden geladen" />
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
          <>
            <div className="hidden md:flex items-center gap-2 px-5 pb-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex-1">Zutat</span>
              <span className="w-20 shrink-0 text-center">Score</span>
              <span className="w-28 shrink-0 text-right">kcal / 100 g</span>
              <span className="w-28 shrink-0 text-right">Preis / kg</span>
            </div>
            <div
              aria-busy={isPlaceholderData}
              className={`stagger flex flex-col gap-2 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {data?.items.map((ingredient) => (
                <IngredientTableRow
                  key={ingredient.id}
                  ingredient={ingredient}
                  onDelete={ingredient.can_delete ? () => setDeleteTarget(ingredient.slug) : undefined}
                />
              ))}
            </div>
          </>
        )}

        <Pagination
          currentPage={data?.page ?? 1}
          totalPages={data?.total_pages ?? 1}
          onPageChange={(nextPage) => patch({ page: nextPage })}
        />
      </div>

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
