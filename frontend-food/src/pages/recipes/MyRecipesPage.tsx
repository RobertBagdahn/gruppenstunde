/**
 * MyRecipesPage — Paginated list of the current user's personal recipes.
 */
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMyRecipes } from '@/api/recipes';
import UnauthGate from '@/components/shared/UnauthGate';
import { useCurrentUser } from '@/api/auth';
import RecipeCard from '@/components/recipe/RecipeCard';
import RecipeBadge from '@/components/recipe/RecipeBadge';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import PageHeader from '@/components/shared/PageHeader';
import { SkeletonCardGrid } from '@/components/ui/skeleton';

export default function MyRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 20;

  const { data: currentUser, isLoading: authLoading } = useCurrentUser();
  const { data, isLoading, error, refetch } = useMyRecipes({ page, page_size: pageSize });

  useDocumentMeta({
    title: 'Meine Rezepte',
    description: 'Deine persönlichen Rezepte',
    url: '/recipes/my-recipes',
  });

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <PageHeader title="Meine Rezepte" description="Deine persönlichen Rezepte" area="recipes" icon="menu_book" countLoading />
        <SkeletonCardGrid count={8} label="Rezepte werden geladen" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <UnauthGate
        title="Meine Rezepte"
        description="Melde dich an, um deine eigenen Rezepte zu speichern und hier wiederzufinden."
        benefits={['Eigene Rezepte anlegen und bearbeiten', 'Rezepte in Ordnern sammeln', 'Mit deiner Gruppe teilen']}
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <ErrorDisplay error={error} title="Rezepte konnten nicht geladen werden" onRetry={() => refetch()} />
      </div>
    );
  }

  const recipes = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <div className="mb-4">
        <Link
          to="/recipes"
          className="inline-flex items-center gap-1.5 text-body font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Alle Rezepte
        </Link>
      </div>

      {/* Hero Header */}
      <PageHeader
        title="Meine Rezepte"
        description="Deine persönlichen Rezepte"
        area="recipes"
        icon="menu_book"
        count={data?.total}
        countLabel={{ one: 'persönliches Rezept', other: 'persönliche Rezepte' }}
      />

      {recipes.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-card rounded-xl p-8 shadow-card">
          <div className="flex justify-center">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-section font-semibold">Noch keine persönlichen Rezepte</p>
          <p className="text-body text-muted-foreground">
            Speichere ein Rezept als persönliches Rezept, um es hier zu sehen.
          </p>
          <Link
            to="/recipes"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-body font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Rezepte durchstöbern
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="relative">
                <RecipeCard recipe={recipe} />
                <div className="absolute top-2 left-2 z-10">
                  <RecipeBadge badge={(recipe.recipe_badge as 'draft' | 'verified' | 'community') ?? 'community'} />
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
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-body font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Zurück
              </button>
              <span className="text-body text-muted-foreground">
                Seite {page} von {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setSearchParams({ page: String(page + 1) })}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-body font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
