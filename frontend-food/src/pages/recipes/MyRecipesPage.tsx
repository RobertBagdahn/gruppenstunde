/**
 * MyRecipesPage — Paginated list of the current user's personal recipes.
 * Canvas layout (food-canvas-layout): white page header with count pill, white recipe cards, shared pagination.
 */
import { StickerBoundary } from '@/components/shared/StickerBoundary';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMyRecipes } from '@/api/recipes';
import UnauthGate from '@/components/shared/UnauthGate';
import { useCurrentUser } from '@/api/auth';
import RecipeCard from '@/components/recipe/RecipeCard';
import RecipeBadge from '@/components/recipe/RecipeBadge';
import ErrorDisplay from '@/components/ErrorDisplay';
import PageHeader from '@/components/shared/PageHeader';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { SkeletonCardGrid } from '@/components/ui/skeleton';

export default function MyRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 20;

  const { data: currentUser, isLoading: authLoading } = useCurrentUser();
  const { data, isLoading, error, refetch } = useMyRecipes({ page, page_size: pageSize });

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <PageHeader title="Meine Rezepte" description="Deine persönlichen Rezepte" countLoading />
        <SkeletonCardGrid count={8} label="Rezepte werden geladen" className="md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4" />
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
      <PageHeader
        title="Meine Rezepte"
        description="Deine persönlichen Rezepte"
        count={data?.total}
        countLabel={{ one: 'persönliches Rezept', other: 'persönliche Rezepte' }}
        actions={
          <Link
            to="/recipes"
            className="press inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary-soft px-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/60"
          >
            <ArrowLeft className="w-4 h-4" />
            Alle Rezepte
          </Link>
        }
      />

      {recipes.length === 0 ? (
        <EmptyState
          icon="menu_book"
          title="Noch keine persönlichen Rezepte"
          description="Speichere ein Rezept als persönliches Rezept, um es hier zu sehen."
          ctaLabel="Rezepte durchstöbern"
          ctaHref="/recipes"
        />
      ) : (
        <>
          <StickerBoundary>
            <div className="stagger grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="relative">
                  <RecipeCard recipe={recipe} />
                  <div className="absolute top-2 left-2 z-10">
                    <RecipeBadge badge={(recipe.recipe_badge as 'draft' | 'verified' | 'community') ?? 'community'} />
                  </div>
                </div>
              ))}
            </div>
          </StickerBoundary>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(next) => setSearchParams({ page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
