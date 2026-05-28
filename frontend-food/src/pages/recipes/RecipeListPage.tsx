import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useRecipes, useDeleteRecipe } from '@/api/recipes';
import RecipeCard from '@/components/recipe/RecipeCard';
import RecipeFilterSidebar from '@/components/recipe/RecipeFilterSidebar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { RECIPE_SORT_OPTIONS, type RecipeFilter } from '@/schemas/recipe';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ListPageHero from '@/components/shared/ListPageHero';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import EmptyState from '@/components/shared/EmptyState';
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

  return (
    <EntityLinkContext.Provider value="list">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      {/* Hero Header */}
      <ListPageHero
        title="Rezepte"
        description="Finde das perfekte Rezept für deine Gruppe"
        icon="menu_book"
        gradientClasses="bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600"
        totalCount={data?.total}
        countLabel="Rezept"
        countIcon="restaurant"
      />

      {/* Search Bar */}
      <ListPageSearchBar
        placeholder="Suche nach Rezepten..."
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={() => handleFilterChange('q', searchInput.trim() || undefined)}
        createLabel="Neues Rezept"
        createHref="/recipes/new"
        gradientClasses="from-rose-500/5 via-pink-500/5 to-rose-500/5"
      />

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-gradient-to-br from-rose-500/10 via-muted/50 to-pink-500/10 animate-pulse h-72"
                />
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <EmptyState
              icon="menu_book"
              title="Keine Rezepte gefunden"
              description="Versuch es mit anderen Suchbegriffen oder Filtern."
              ctaLabel="Erstes Rezept erstellen"
              ctaHref="/recipes/new"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
          <Pagination
            currentPage={filters.page ?? 1}
            totalPages={data?.total_pages ?? 1}
            onPageChange={(page) => handleFilterChange('page', page)}
          />
        </div>
      </div>

      {/* Delete Confirmation */}
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
