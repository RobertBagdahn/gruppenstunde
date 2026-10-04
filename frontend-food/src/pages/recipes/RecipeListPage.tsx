import { SkeletonCardGrid, SkeletonTableRows } from '@/components/ui/skeleton';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { costBounds } from '@/lib/recipeCostRanges';
import { useNavigate, Link } from 'react-router-dom';
import type { z } from 'zod';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useRecipes, useDeleteRecipe, useForkRecipe } from '@/api/recipes';
import RecipeCard from '@/components/recipe/RecipeCard';
import RecipeTable from '@/components/recipe/RecipeTable';
import RecipeFilterSidebar from '@/components/recipe/RecipeFilterSidebar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { RECIPE_SORT_OPTIONS, type RecipeFilter } from '@/schemas/recipe';
import { RecipeListStateSchema } from '@/schemas/listState';
import { takeLegacyValue } from '@/lib/listStateStorage';
import { usePersistedListState, useDebouncedSearchInput } from '@/hooks/usePersistedListState';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import PageHeader from '@/components/shared/PageHeader';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import ActiveFiltersHint from '@/components/shared/ActiveFiltersHint';
import EmptyState from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { notify } from '@/lib/notify';
import { Icon } from '@/components/ui/icon';

type RecipeListState = z.infer<typeof RecipeListStateSchema>;
type ViewMode = 'grid' | 'table';

const RECIPE_LIST_DEFAULTS = {
  origin: ['verified'],
  sort: 'use_count',
  view: 'grid',
  page: 1,
} satisfies Partial<RecipeListState>;
// The search text stays URL-only: restoring it silently led to empty lists ("0 Rezepte").
const PERSIST_EXCLUDE = ['q', 'page', 'seed'] as const;
const COUNT_EXCLUDE = ['page', 'view', 'seed'] as const;

/** The view mode used to live in its own key; take it over once. */
function migrateLegacyView() {
  return takeLegacyValue('recipe-search-view') === 'table' ? { view: 'table' } : null;
}

function newRandomSeed(): number {
  return 1 + Math.floor(Math.random() * 2_147_483_646);
}

function buildPageTitle(filters: Partial<RecipeFilter>): string {
  const parts: string[] = [];
  if (filters.q) parts.push(filters.q);
  if (filters.recipe_type?.[0]) {
    const labels: Record<string, string> = {
      breakfast: 'Frühstück',
      warm_meal: 'Warme Mahlzeit',
      cold_meal: 'Kalte Mahlzeit',
      dessert: 'Nachtisch',
      drink: 'Getränk',
      snack: 'Snack',
    };
    const label = labels[filters.recipe_type[0]];
    if (label) parts.push(label);
  }
  if (filters.origin?.length === 1 && filters.origin[0] === 'verified' && parts.length === 0) {
    return 'Verifizierte Rezepte – Inspi';
  }
  parts.push('Rezepte – Inspi');
  return parts.join(' – ');
}

export default function RecipeListPage() {
  const navigate = useNavigate();
  const { state, patch, reset, activeCount, restored } = usePersistedListState({
    key: 'recipes',
    schema: RecipeListStateSchema,
    defaults: RECIPE_LIST_DEFAULTS,
    persistExclude: PERSIST_EXCLUDE,
    countExclude: COUNT_EXCLUDE,
    migrateLegacy: migrateLegacyView,
  });
  const { view, ...filterState } = state;
  const viewMode: ViewMode = view;
  // A shared or legacy URL may say "random" without a seed: keep one for this visit
  // so paging stays inside one shuffle.
  const [fallbackSeed] = useState(newRandomSeed);
  const filters = useMemo<Partial<RecipeFilter>>(
    () => ({
      ...filterState,
      ...costBounds(filterState.cost),
      seed: filterState.sort === 'random' ? (filterState.seed ?? fallbackSeed) : undefined,
      page_size: 20,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filterState)],
  );
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<{ id: number; title: string } | null>(null);
  const [cloneTitle, setCloneTitle] = useState('');

  const { data, isPending: isLoading, error, refetch, isPlaceholderData } = useRecipes(filters, { enabled: restored });
  const deleteRecipe = useDeleteRecipe();
  const forkRecipe = useForkRecipe(cloneTarget?.id ?? 0);

  const search = useDebouncedSearchInput(state.q ?? '', (value) => {
    patch({ q: value.trim() || undefined, page: undefined }, { replace: true });
  });

  useEffect(() => {
    document.title = buildPageTitle(filters);
    return () => {
      document.title = 'Inspi – Gruppenstunden-Inspirator';
    };
  }, [filters]);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    patch({
      [key]: value,
      ...(key !== 'page' ? { page: undefined } : {}),
      // Every new pick of "random" is a new shuffle; other sorts carry no seed.
      ...(key === 'sort' ? { seed: value === 'random' ? newRandomSeed() : undefined } : {}),
    } as Partial<RecipeListState>);
  }, [patch]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const toggleView = useCallback((mode: ViewMode) => {
    patch({ view: mode }, { replace: true });
  }, [patch]);

  return (
    <EntityLinkContext.Provider value="list">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <PageHeader
        title="Rezepte"
        description="Finde das perfekte Rezept für deine Gruppe"
        area="recipes"
        icon="menu_book"
        count={data?.total}
        countLoading={isLoading || !restored}
        countLabel={{ one: 'Rezept', other: 'Rezepte' }}
      />

      <ListPageSearchBar
        placeholder="Suche nach Rezepten..."
        value={search.input}
        onChange={search.setInput}
        onSubmit={search.submit}
        createLabel="Neues Rezept"
        createHref="/recipes/new"
      />

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        <RecipeFilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        <div className="flex-1">
          <ActiveFiltersHint activeCount={activeCount} onReset={handleReset} />
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Link
              to="/recipes/new"
              className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-body font-semibold transition-all"
            >
              <Icon name="add_circle" size={16} />
              Neues Rezept
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2 ml-auto min-w-0">
              <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-1.5 rounded-lg min-w-0">
                <Icon name="sort" size={20} className="text-primary" />
                <select
                  value={filters.sort ?? 'use_count'}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="min-w-0 px-2 py-1 rounded-xl border text-body bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none font-medium"
                >
                  {RECIPE_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex shrink-0 items-center bg-secondary border border-border rounded-lg p-1 gap-0.5">
                <button
                  onClick={() => toggleView('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Kacheln"
                >
                  <Icon name="grid_view" size={20} />
                </button>
                <button
                  onClick={() => toggleView('table')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Tabelle"
                >
                  <Icon name="view_list" size={20} />
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <ErrorDisplay error={error} onRetry={() => refetch()} />
          ) : isLoading || !restored ? (
            viewMode === 'table' ? (
              <RecipeTableSkeleton />
            ) : (
              <SkeletonCardGrid count={10} label="Rezepte werden geladen" className="md:grid-cols-3 xl:grid-cols-5" />
            )
          ) : data?.items.length === 0 ? (
            <EmptyState
              icon="menu_book"
              title={filters.q ? `Keine Rezepte für "${filters.q}" gefunden` : 'Keine Rezepte gefunden'}
              description={hasNonDefaultFilters(filters) ? 'Versuch es mit weniger Filtern.' : 'Versuch es mit anderen Suchbegriffen oder Filtern.'}
              ctaLabel={hasNonDefaultFilters(filters) ? 'Filter zurücksetzen' : 'Erstes Rezept erstellen'}
              ctaHref={hasNonDefaultFilters(filters) ? undefined : '/recipes/new'}
              onCtaClick={hasNonDefaultFilters(filters) ? handleReset : undefined}
            />
          ) : viewMode === 'table' ? (
            <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={isPlaceholderData}>
            <RecipeTable
              recipes={data!.items}
              searchQuery={filters.q}
              navigate={navigate}
              onDelete={(id, title) => setDeleteTarget({ id, title })}
              onClone={(id, title) => {
                setCloneTarget({ id, title });
                setCloneTitle(`${title} (Kopie)`);
              }}
            />
            </div>
          ) : (
            <div
              aria-busy={isPlaceholderData}
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {data?.items.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  searchQuery={filters.q}
                  canEdit={recipe.can_edit}
                  canDelete={recipe.can_delete}
                  onEdit={() => navigate(`/recipes/${recipe.slug}`)}
                  onDelete={() => setDeleteTarget({ id: recipe.id, title: recipe.title })}
                  onClone={() => {
                    setCloneTarget({ id: recipe.id, title: recipe.title });
                    setCloneTitle(`${recipe.title} (Kopie)`);
                  }}
                />
              ))}
            </div>
          )}

          <Pagination
            currentPage={filters.page ?? 1}
            totalPages={data?.total_pages ?? 1}
            onPageChange={(page) => handleFilterChange('page', page)}
          />
        </div>
      </div>

      <Dialog open={!!cloneTarget} onOpenChange={(open) => { if (!open) setCloneTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emphasis">
              <Icon name="content_copy" size={24} className="text-primary" />
              Rezept clonen
            </DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              Erstelle eine persönliche Kopie dieses Rezepts. Du kannst sie danach frei bearbeiten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block text-body font-medium">Name für die Kopie</label>
            <input
              type="text"
              value={cloneTitle}
              onChange={(e) => setCloneTitle(e.target.value)}
              placeholder="Name des Rezepts"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-body focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCloneTarget(null)}
              className="px-4 py-2 border rounded-lg text-body hover:bg-muted transition"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={!cloneTitle.trim() || forkRecipe.isPending}
              onClick={() => {
                if (!cloneTarget) return;
                forkRecipe.mutate(
                  { title: cloneTitle.trim() },
                  {
                    onSuccess: (forkedRecipe) => {
                      setCloneTarget(null);
                      notify.success('Rezept geklont');
                      navigate(`/recipes/${forkedRecipe.slug}`);
                    },
                    onError: (err) => {
                      notify.error('Rezept konnte nicht geklont werden', { error: err });
                    },
                  },
                );
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-body font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {forkRecipe.isPending ? (
                <>
                  <Icon name="progress_activity" size={20} className="animate-spin" />
                  Wird geklont...
                </>
              ) : (
                'Rezept clonen'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteRecipe.mutate(deleteTarget.id, {
            onSuccess: () => {
              notify.success('Rezept gelöscht');
              setDeleteTarget(null);
              refetch();
            },
            onError: (err) => {
              notify.error('Rezept konnte nicht gelöscht werden', { error: err });
              setDeleteTarget(null);
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
        title={`"${deleteTarget?.title}" löschen?`}
        description="Das Rezept wird gelöscht und ist nicht mehr sichtbar."
        confirmLabel="Löschen"
        loading={deleteRecipe.isPending}
      />
    </div>
    </EntityLinkContext.Provider>
  );
}

function hasNonDefaultFilters(filters: Partial<RecipeFilter>): boolean {
  if (filters.q) return true;
  if (filters.recipe_type?.length) return true;
  if (filters.difficulty?.length) return true;
  if (filters.execution_time?.length) return true;
  if (filters.preparation_method?.length) return true;
  if (filters.origin && !(filters.origin.length === 1 && filters.origin[0] === 'verified')) return true;
  if (filters.tag_slugs?.length) return true;
  if (filters.cost?.length) return true;
  return false;
}

function RecipeTableSkeleton() {
  return <SkeletonTableRows rows={8} columns={3} label="Rezepte werden geladen" />;
}
