import { useParams, Link } from 'react-router-dom';
import { usePublicUserProfile } from '@/api/profile';
import { getContentUrl } from '@/schemas/content';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading, error } = usePublicUserProfile(Number(userId) || 0);

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-40" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          </div>
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container py-8 max-w-3xl">
        <p className="text-destructive">Profil nicht gefunden.</p>
      </div>
    );
  }

  const displayName = profile.scout_name || profile.first_name || 'Unbekannt';
  const memberSince = new Date(profile.created_at).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-5">
        {profile.profile_picture_url ? (
          <img
            src={profile.profile_picture_url}
            alt={displayName}
            className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-4xl">person</span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">Dabei seit {memberSince}</p>
        </div>
      </div>

      {/* About */}
      {profile.about_me && (
        <div className="mt-6 bg-card rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Über mich</h2>
          <p className="text-sm">{profile.about_me}</p>
        </div>
      )}

      {/* Content */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <span className="material-symbols-outlined text-primary">lightbulb</span>
          Beiträge von {displayName}
          {profile.contents.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({profile.contents.length})</span>
          )}
        </h2>
        {profile.contents.length === 0 ? (
          <p className="text-muted-foreground italic">Noch keine veröffentlichten Beiträge.</p>
        ) : (
          <div className="grid gap-4">
            {profile.contents.map((item) => (
              <Link
                key={item.id}
                to={getContentUrl(item.content_type, item.slug)}
                className="flex gap-4 bg-card rounded-xl border p-4 hover:border-primary/50 hover:shadow-soft transition-all"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-20 aspect-square rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
