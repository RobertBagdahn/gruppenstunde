/**
 * MyRecipesPage — Paginated list of the current user's personal recipes.
 */
import { useSearchParams, Link } from 'react-router-dom';
import { useMyRecipes } from '@/api/recipes';
import { useCurrentUser } from '@/api/auth';
import RecipeCard from '@/components/recipe/RecipeCard';
import RecipeBadge from '@/components/recipe/RecipeBadge';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export default function MyRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 20;

  const { data: currentUser, isLoading: authLoading } = useCurrentUser();
  const { data, isLoading, error, refetch } = useMyRecipes({ page, page_size: pageSize });

  useDocumentMeta({
    title: 'Meine Rezepte',
    description: 'Deine persoenlichen Rezepte',
    url: '/recipes/my-recipes',
  });

  if (authLoading || isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-muted-foreground">lock</span>
          <h1 className="text-xl font-bold">Anmeldung erforderlich</h1>
          <p className="text-sm text-muted-foreground">
            Melde dich an, um deine persoenlichen Rezepte zu sehen.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Anmelden
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <ErrorDisplay error={error} title="Fehler beim Laden" onRetry={() => refetch()} />
      </div>
    );
  }

  const recipes = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Meine Rezepte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} persoenliche Rezepte
          </p>
        </div>
        <Link
          to="/recipes"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Alle Rezepte
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <span className="material-symbols-outlined text-5xl text-muted-foreground">
            menu_book
          </span>
          <p className="text-lg font-semibold">Noch keine persoenlichen Rezepte</p>
          <p className="text-sm text-muted-foreground">
            Speichere ein Rezept als persoenliches Rezept, um es hier zu sehen.
          </p>
          <Link
            to="/recipes"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Rezepte durchstoebern
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="relative">
                <RecipeCard recipe={recipe} />
                <div className="absolute top-2 left-2 z-10">
                  <RecipeBadge badge={recipe.recipe_badge} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setSearchParams({ page: String(page - 1) })}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                Zurück
              </button>
              <span className="text-sm text-muted-foreground">
                Seite {page} von {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setSearchParams({ page: String(page + 1) })}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                Weiter
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
