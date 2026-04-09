import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useRecipes, useDeleteRecipe } from '@/api/recipes';
import RecipeCard from '@/components/recipe/RecipeCard';
import RecipeFilterSidebar from '@/components/recipe/RecipeFilterSidebar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { RECIPE_SORT_OPTIONS, type RecipeFilter } from '@/schemas/recipe';
import ErrorDisplay from '@/components/ErrorDisplay';
import { toast } from 'sonner';

const DEFAULT_FILTERS: Partial<RecipeFilter> = {
  sort: 'newest',
  page: 1,
  page_size: 20,
};

/** Deserialize URL search params into filter state */
function searchParamsToFilters(params: URLSearchParams): Partial<RecipeFilter> {
  const filters: Partial<RecipeFilter> = { ...DEFAULT_FILTERS };
  const q = params.get('q');
  if (q) filters.q = q;
  const recipeType = params.get('recipe_type');
  if (recipeType) filters.recipe_type = recipeType;
  const difficulty = params.get('difficulty');
  if (difficulty) filters.difficulty = difficulty;
  const costsRating = params.get('costs_rating');
  if (costsRating) filters.costs_rating = costsRating;
  const executionTime = params.get('execution_time');
  if (executionTime) filters.execution_time = executionTime;
  const sort = params.get('sort');
  if (sort) filters.sort = sort;
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
  if (filters.recipe_type) params.set('recipe_type', filters.recipe_type);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.costs_rating) params.set('costs_rating', filters.costs_rating);
  if (filters.execution_time) params.set('execution_time', filters.execution_time);
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.tag_slugs?.length) {
    filters.tag_slugs.forEach((slug) => params.append('tag_slugs', slug));
  }
  if (filters.scout_level_ids?.length) {
    filters.scout_level_ids.forEach((id) => params.append('scout_level_ids', String(id)));
  }
  return params;
}

export default function RecipeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const [filters, setFilters] = useState<Partial<RecipeFilter>>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

  const { data, isLoading, error, refetch } = useRecipes(filters);
  const deleteRecipe = useDeleteRecipe();

  // On mount: read URL params
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (searchParams.toString()) {
        const parsed = searchParamsToFilters(searchParams);
        setFilters(parsed);
        setSearchInput(parsed.q ?? '');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filter state → URL
  useEffect(() => {
    if (initialized.current) {
      const newParams = filtersToSearchParams(filters);
      setSearchParams(newParams, { replace: true });
    }
  }, [filters, setSearchParams]);

  // Document title
  useEffect(() => {
    const q = filters.q;
    document.title = q ? `"${q}" – Rezepte – Inspi` : 'Rezepte – Inspi';
    return () => {
      document.title = 'Inspi – Gruppenstunden-Inspirator';
    };
  }, [filters.q]);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Reset to page 1 when changing filters (unless it's a page change)
      ...(key !== 'page' ? { page: 1 } : {}),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    handleFilterChange('q', searchInput.trim() || undefined);
  }

  return (
    <div className="container py-4 md:py-8 px-3 md:px-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 p-4 md:p-8 mb-4 md:mb-8 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 hidden md:block" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4 hidden md:block" />
        <div className="absolute top-10 right-40 w-20 h-20 bg-pink-300/20 rounded-full hidden md:block" />
        <div className="relative flex items-center gap-4">
          <div className="hidden sm:flex items-center justify-center w-20 h-20 md:w-28 md:h-28 bg-white/20 backdrop-blur-sm rounded-2xl">
            <span className="material-symbols-outlined text-white text-4xl md:text-5xl">menu_book</span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Rezepte</h1>
            <p className="text-white/80 text-sm md:text-base mt-1">
              Finde das perfekte Rezept fuer deine Gruppe
            </p>
            {data && (
              <span className="inline-flex items-center gap-1.5 mt-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full px-4 py-1.5">
                <span className="material-symbols-outlined text-[18px]">restaurant</span>
                {data.total} Rezept{data.total !== 1 ? 'e' : ''} gefunden
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 md:mb-8 bg-gradient-to-r from-rose-500/5 via-pink-500/5 to-rose-500/5 rounded-2xl p-4 md:p-6 border border-rose-500/10">
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-muted-foreground">
              search
            </span>
            <input
              type="search"
              placeholder="Suche nach Rezepten..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-background text-foreground placeholder:text-muted-foreground border focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-medium hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>
          <Link
            to="/recipes/new"
            className="shrink-0 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-[hsl(174,60%,41%)] text-white font-medium hover:shadow-lg transition-all hidden sm:flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="text-sm">Neues Rezept</span>
          </Link>
        </form>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Filter Sidebar */}
        <RecipeFilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Results */}
        <div className="flex-1">
          {/* Sort */}
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/recipes/new"
              className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-primary to-[hsl(174,60%,41%)] text-white text-sm font-medium hover:shadow-lg transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Neues Rezept
            </Link>
            <div className="flex items-center gap-2 bg-gradient-to-r from-rose-500/5 to-transparent px-4 py-2 rounded-lg ml-auto">
              <span className="material-symbols-outlined text-rose-500 text-[18px]">sort</span>
              <select
                value={filters.sort ?? 'newest'}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm bg-card focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium"
              >
                {RECIPE_SORT_OPTIONS.map((opt) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-gradient-to-br from-rose-500/10 via-muted/50 to-pink-500/10 animate-pulse h-72"
                />
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-rose-500/5 via-card to-pink-500/5 rounded-xl border border-dashed border-rose-500/30">
              <span className="material-symbols-outlined text-6xl text-rose-400 mb-4">
                menu_book
              </span>
              <p className="text-lg font-semibold text-foreground">Keine Rezepte gefunden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Versuch es mit anderen Suchbegriffen oder Filtern.
              </p>
              <Link
                to="/recipes/new"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white font-medium hover:shadow-lg transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Erstes Rezept erstellen
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.items.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  canEdit={recipe.can_edit}
                  canDelete={recipe.can_delete}
                  onEdit={() => navigate(`/recipes/${recipe.slug}`)}
                  onDelete={() => setDeleteTarget({ id: recipe.id, title: recipe.title })}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex justify-center gap-2 mt-10 bg-gradient-to-r from-transparent via-rose-500/5 to-transparent py-4 rounded-xl">
              {Array.from({ length: data.total_pages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleFilterChange('page', i + 1)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                    filters.page === i + 1
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30 scale-110'
                      : 'border bg-card hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteRecipe.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('Rezept geloescht');
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
        title={`"${deleteTarget?.title}" loeschen?`}
        description="Das Rezept wird geloescht und ist nicht mehr sichtbar."
        confirmLabel="Loeschen"
        loading={deleteRecipe.isPending}
      />
    </div>
  );
}
