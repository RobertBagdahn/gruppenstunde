import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Utensils, ShoppingCart, CalendarDays, ChevronDown, Clock } from 'lucide-react';
import { usePublicProfile } from '@/api/profile';
import ErrorDisplay from '@/components/ErrorDisplay';
import RecipeThumbnail from '@/components/recipe/RecipeThumbnail';
import DetailHeader from '@/components/shared/DetailHeader';
import WizardSectionHeading from '@/pages/planning/wizard/WizardSectionHeading';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHr < 24) return `vor ${diffHr} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-40 rounded-lg skeleton-shimmer" />
          <div className="h-4 w-24 rounded-lg skeleton-shimmer" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-xl bg-card p-5 shadow-card">
          <div className="h-10 w-48 rounded-lg skeleton-shimmer" />
          <div className="h-4 w-full rounded-lg skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

/** Public list row: neutral white card, whole row is the link target (44 px and up). */
const LIST_ROW_CLASS =
  'card-hover press flex min-h-11 items-center justify-between gap-4 rounded-xl bg-card p-4 shadow-card';

export default function ProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: profile, isLoading, error } = usePublicProfile(slug!);
  const [recipeCount, setRecipeCount] = useState(5);

  if (isLoading) return <ProfileSkeleton />;

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        title="Profil nicht gefunden"
        description="Dieses Profil existiert nicht oder ist nicht öffentlich."
      />
    );
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <DetailHeader
        title={profile.scout_name || profile.first_name}
        description={
          <span className="flex flex-col gap-1">
            <span>
              Mitglied seit{' '}
              {new Date(profile.created_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })}
            </span>
            <span className="flex items-center gap-1 text-body">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Zuletzt aktiv {relativeTime(profile.updated_at)}
            </span>
          </span>
        }
        actions={
          <span
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary-dark"
          >
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={profile.scout_name || profile.first_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-10 w-10" aria-hidden="true" />
            )}
          </span>
        }
      />

      {/* About */}
      {profile.about_me && (
        <section className="rounded-xl bg-card p-5 shadow-card">
          <WizardSectionHeading icon={<User className="h-5 w-5" />}>Über mich</WizardSectionHeading>
          <p className="whitespace-pre-wrap text-foreground">{profile.about_me}</p>
        </section>
      )}

      {/* Recipes */}
      <section className="rounded-xl bg-card p-5 shadow-card">
        <WizardSectionHeading icon={<Utensils className="h-5 w-5" />}>Rezepte</WizardSectionHeading>
        {profile.recipes.length === 0 ? (
          <p className="text-body text-muted-foreground">Noch keine öffentlichen Rezepte.</p>
        ) : (
          <div className="space-y-3">
            {profile.recipes.slice(0, recipeCount).map((recipe) => (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.slug}`}
                className="card-hover press flex items-center gap-4 rounded-xl bg-card p-4 shadow-soft"
              >
                <RecipeThumbnail
                  imageUrl={recipe.image_url}
                  title={recipe.title}
                  size="lg"
                  imgClassName="rounded-lg"
                  className="rounded-lg"
                />
                <div className="min-w-0">
                  <h3 className="truncate font-display font-semibold text-foreground">{recipe.title}</h3>
                  <p className="line-clamp-1 text-body text-muted-foreground">{recipe.summary}</p>
                  <p className="mt-1 text-caption text-muted-foreground">{formatDate(recipe.created_at)}</p>
                </div>
              </Link>
            ))}
            {recipeCount < profile.recipes.length && (
              <button
                type="button"
                onClick={() => setRecipeCount(profile.recipes.length)}
                className="press flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-soft px-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                Weitere anzeigen ({profile.recipes.length - recipeCount})
              </button>
            )}
          </div>
        )}
      </section>

      {/* Shopping Lists */}
      <section className="rounded-xl bg-card p-5 shadow-card">
        <WizardSectionHeading icon={<ShoppingCart className="h-5 w-5" />}>Einkaufslisten</WizardSectionHeading>
        {profile.shopping_lists.length === 0 ? (
          <p className="text-body text-muted-foreground">Noch keine Einkaufslisten.</p>
        ) : (
          <div className="space-y-3">
            {profile.shopping_lists.map((list) => (
              <Link key={list.id} to={`/shopping-lists/${list.id}`} className={LIST_ROW_CLASS}>
                <div className="min-w-0">
                  <span className="font-display font-semibold text-foreground">{list.name}</span>
                  <p className="mt-0.5 text-caption text-muted-foreground">{formatDate(list.created_at)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-body tabular-nums text-muted-foreground">
                  {list.item_count} Items
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Meal Plans */}
      <section className="rounded-xl bg-card p-5 shadow-card">
        <WizardSectionHeading icon={<CalendarDays className="h-5 w-5" />}>Essenspläne</WizardSectionHeading>
        {profile.meal_plans.length === 0 ? (
          <p className="text-body text-muted-foreground">Noch keine Essenspläne.</p>
        ) : (
          <div className="space-y-3">
            {profile.meal_plans.map((plan) => (
              <Link key={plan.id} to={`/meal-plans/${plan.id}`} className={LIST_ROW_CLASS}>
                <div className="min-w-0">
                  <span className="font-display font-semibold text-foreground">{plan.name}</span>
                  <p className="mt-0.5 text-caption text-muted-foreground">{formatDate(plan.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
