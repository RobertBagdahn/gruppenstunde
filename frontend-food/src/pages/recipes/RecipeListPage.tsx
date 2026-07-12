import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useRecipes, useDeleteRecipe, useForkRecipe } from '@/api/recipes';
import RecipeCard from '@/components/recipe/RecipeCard';
import RecipeTable from '@/components/recipe/RecipeTable';
import RecipeFilterSidebar from '@/components/recipe/RecipeFilterSidebar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { RECIPE_SORT_OPTIONS, type RecipeFilter } from '@/schemas/recipe';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ListPageHero from '@/components/shared/ListPageHero';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import EmptyState from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const VIEW_STORAGE_KEY = 'recipe-search-view';
type ViewMode = 'grid' | 'table';

function getStoredView(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'table') return 'table';
  } catch {
    /* localStorage not available */
  }
  return 'grid';
}

function setStoredView(view: ViewMode) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* localStorage not available */
  }
}

const DEFAULT_FILTERS: Partial<RecipeFilter> = {
  origin: ['verified'],
  sort: 'use_count',
  page: 1,
  page_size: 20,
};

/** Deserialize URL search params into filter state */
function searchParamsToFilters(params: URLSearchParams): Partial<RecipeFilter> {
  const filters: Partial<RecipeFilter> = { ...DEFAULT_FILTERS };
  const q = params.get('q');
  if (q) filters.q = q;

  const recipeType = params.getAll('recipe_type');
  if (recipeType.length > 0) filters.recipe_type = recipeType;
  const prepMethod = params.getAll('preparation_method');
  if (prepMethod.length > 0) filters.preparation_method = prepMethod;
  const difficulty = params.getAll('difficulty');
  if (difficulty.length > 0) filters.difficulty = difficulty;
  const executionTime = params.getAll('execution_time');
  if (executionTime.length > 0) filters.execution_time = executionTime;
  const origin = params.getAll('origin');
  if (origin.length > 0) filters.origin = origin;
  const sort = params.get('sort');
  if (sort) filters.sort = sort;

  const costsMin = params.get('costs_min');
  if (costsMin) filters.costs_min = parseFloat(costsMin);
  const costsMax = params.get('costs_max');
  if (costsMax) filters.costs_max = parseFloat(costsMax);
  const page = params.get('page');
  if (page) filters.page = parseInt(page, 10);

  const tagSlugs = params.getAll('tag_slugs');
  if (tagSlugs.length > 0) filters.tag_slugs = tagSlugs;
  const scoutLevelIds = params.getAll('scout_level_ids');
  if (scoutLevelIds.length > 0) filters.scout_level_ids = scoutLevelIds.map(Number);

  return filters;
}

/** Serialize filter state into URLSearchParams */
function filtersToSearchParams(filters: Partial<RecipeFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.recipe_type?.length) {
    filters.recipe_type.forEach((v) => params.append('recipe_type', v));
  }
  if (filters.preparation_method?.length) {
    filters.preparation_method.forEach((v) => params.append('preparation_method', v));
  }
  if (filters.difficulty?.length) {
    filters.difficulty.forEach((v) => params.append('difficulty', v));
  }
  if (filters.execution_time?.length) {
    filters.execution_time.forEach((v) => params.append('execution_time', v));
  }
  if (filters.origin?.length && !(filters.origin.length === 1 && filters.origin[0] === 'verified')) {
    filters.origin.forEach((v) => params.append('origin', v));
  }
  if (filters.costs_min !== undefined) params.set('costs_min', String(filters.costs_min));
  if (filters.costs_max !== undefined) params.set('costs_max', String(filters.costs_max));
  if (filters.sort && filters.sort !== 'use_count') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.tag_slugs?.length) {
    filters.tag_slugs.forEach((slug) => params.append('tag_slugs', slug));
  }
  if (filters.scout_level_ids?.length) {
    filters.scout_level_ids.forEach((id) => params.append('scout_level_ids', String(id)));
  }
  return params;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const [filters, setFilters] = useState<Partial<RecipeFilter>>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<{ id: number; title: string } | null>(null);
  const [cloneTitle, setCloneTitle] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredView);

  const { data, isLoading, error, refetch } = useRecipes(filters);
  const deleteRecipe = useDeleteRecipe();
  const forkRecipe = useForkRecipe(cloneTarget?.id ?? 0);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (searchParams.toString()) {
        const parsed = searchParamsToFilters(searchParams);
        setFilters(parsed);
        setSearchInput(parsed.q ?? '');
      }
    }
  }, []);

  useEffect(() => {
    if (initialized.current) {
      const newParams = filtersToSearchParams(filters);
      setSearchParams(newParams, { replace: true });
    }
  }, [filters, setSearchParams]);

  useEffect(() => {
    document.title = buildPageTitle(filters);
    return () => {
      document.title = 'Inspi – Gruppenstunden-Inspirator';
    };
  }, [filters.q, filters.recipe_type, filters.origin]);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {}),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
  }, []);

  const toggleView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setStoredView(mode);
  }, []);

  return (
    <EntityLinkContext.Provider value="list">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <ListPageHero
        title="Rezepte"
        description="Finde das perfekte Rezept für deine Gruppe"
        icon="menu_book"
        gradientClasses="gradient-primary"
        totalCount={data?.total}
        countLabel="Rezept"
        countIcon="restaurant"
      />

      <ListPageSearchBar
        placeholder="Suche nach Rezepten..."
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={() => handleFilterChange('q', searchInput.trim() || undefined)}
        createLabel="Neues Rezept"
        createHref="/recipes/new"
        gradientClasses=""
      />

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        <RecipeFilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/recipes/new"
              className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Neues Rezept
            </Link>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-1.5 rounded-lg">
                <span className="material-symbols-outlined text-primary text-[18px]">sort</span>
                <select
                  value={filters.sort ?? 'use_count'}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="px-2 py-1 rounded-md border text-sm bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none font-medium"
                >
                  {RECIPE_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center bg-secondary border border-border rounded-lg p-1 gap-0.5">
                <button
                  onClick={() => toggleView('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Kacheln"
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  onClick={() => toggleView('table')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Tabelle"
                >
                  <span className="material-symbols-outlined text-[18px]">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <ErrorDisplay error={error} onRetry={() => refetch()} />
          ) : isLoading ? (
            viewMode === 'table' ? (
              <RecipeTableSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border bg-muted border-border animate-pulse h-72"
                  />
                ))}
              </div>
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="material-symbols-outlined text-primary">content_copy</span>
              Rezept clonen
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Erstelle eine persönliche Kopie dieses Rezepts. Du kannst sie danach frei bearbeiten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block text-sm font-medium">Name für die Kopie</label>
            <input
              type="text"
              value={cloneTitle}
              onChange={(e) => setCloneTitle(e.target.value)}
              placeholder="Name des Rezepts"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCloneTarget(null)}
              className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition"
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
                      toast.success('Rezept geklont');
                      navigate(`/recipes/${forkedRecipe.slug}`);
                    },
                    onError: (err) => {
                      toast.error('Fehler beim Klonen', { description: err.message });
                    },
                  },
                );
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {forkRecipe.isPending ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
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
              toast.success('Rezept gelöscht');
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
  if (filters.scout_level_ids?.length) return true;
  if (filters.costs_min !== undefined || filters.costs_max !== undefined) return true;
  return false;
}

function RecipeTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-muted border-border animate-pulse">
          <div className="w-12 h-12 rounded-lg bg-muted-foreground/20 shrink-0" />
          <div className="flex-1 h-4 bg-muted-foreground/20 rounded" />
          <div className="w-16 h-4 bg-muted-foreground/20 rounded hidden sm:block" />
          <div className="w-12 h-4 bg-muted-foreground/20 rounded hidden md:block" />
          <div className="w-10 h-4 bg-muted-foreground/20 rounded hidden md:block" />
        </div>
      ))}
    </div>
  );
}
