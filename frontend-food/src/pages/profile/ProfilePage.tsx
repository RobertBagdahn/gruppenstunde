import { useParams, Link } from 'react-router-dom';
import { User, Utensils, ShoppingCart, CalendarDays } from 'lucide-react';
import { usePublicProfile } from '@/api/profile';
import ErrorDisplay from '@/components/ErrorDisplay';

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-4 w-3/4 bg-muted rounded" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: profile, isLoading, error } = usePublicProfile(slug!);

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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {profile.profile_picture_url ? (
            <img
              src={profile.profile_picture_url}
              alt={profile.scout_name || profile.first_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            {profile.scout_name || profile.first_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Mitglied seit {new Date(profile.created_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* About */}
      {profile.about_me && (
        <section>
          <h2 className="font-display font-bold text-lg text-foreground mb-2">Über mich</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{profile.about_me}</p>
        </section>
      )}

      {/* Recipes */}
      <section>
        <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-primary" />
          Rezepte
        </h2>
        {profile.recipes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine öffentlichen Rezepte.</p>
        ) : (
          <div className="space-y-3">
            {profile.recipes.map((recipe) => (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.slug}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                {recipe.image_url && (
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-foreground truncate">{recipe.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{recipe.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Shopping Lists */}
      <section>
        <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Einkaufslisten
        </h2>
        {profile.shopping_lists.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Einkaufslisten.</p>
        ) : (
          <div className="space-y-3">
            {profile.shopping_lists.map((list) => (
              <Link
                key={list.id}
                to={`/shopping-lists/${list.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <span className="font-display font-semibold text-foreground">{list.name}</span>
                <span className="text-sm text-muted-foreground">{list.item_count} Items</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Meal Plans */}
      <section>
        <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Essenspläne
        </h2>
        {profile.meal_plans.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Essenspläne.</p>
        ) : (
          <div className="space-y-3">
            {profile.meal_plans.map((plan) => (
              <Link
                key={plan.id}
                to={`/meal-plans/${plan.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <span className="font-display font-semibold text-foreground">{plan.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
