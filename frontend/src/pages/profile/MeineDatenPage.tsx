import { useParams, Link } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useMyProfile, usePublicUserProfile } from '@/api/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const GENDER_LABELS: Record<string, string> = {
  male: 'Männlich',
  female: 'Weiblich',
  diverse: 'Divers',
  no_answer: 'Keine Angabe',
};

export default function MeineDatenPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: myProfile, isLoading: myProfileLoading } = useMyProfile();
  const { data: publicProfile, isLoading: publicLoading } = usePublicUserProfile(Number(userId) || 0);

  const isOwnProfile = user && String(user.id) === userId;
  const isLoading = userLoading || (isOwnProfile ? myProfileLoading : publicLoading);

  if (isLoading || !user) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="animate-pulse space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted" />
            <div className="h-6 bg-muted rounded w-48" />
          </div>
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const profile = isOwnProfile ? myProfile : publicProfile;

  if (!profile) {
    return (
      <div className="container py-8 max-w-2xl">
        <p className="text-destructive">Profil nicht gefunden.</p>
        <Link to="/profile" className="text-sm text-primary mt-2 inline-block">
          Zurück zum Profil
        </Link>
      </div>
    );
  }

  const displayName = profile.scout_name || profile.first_name || 'Unbekannt';
  const initials = ((profile.first_name || '').charAt(0) + (('last_name' in profile ? profile.last_name : '') || '').charAt(0)).toUpperCase() || '?';

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Zurück zum Profil
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="w-20 h-20 ring-2 ring-primary/20 ring-offset-2">
              <AvatarImage src={profile.profile_picture_url ?? undefined} alt={displayName} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-[hsl(174,60%,41%)] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{displayName}</h1>
              {'created_at' in profile && (
                <p className="text-sm text-muted-foreground">
                  Mitglied seit {new Date(profile.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Persönliche Daten */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">person</span>
            Persönliche Daten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DataField label="Pfadfindername" value={profile.scout_name} />
            {'first_name' in profile && <DataField label="Vorname" value={profile.first_name} />}
            {'last_name' in profile && <DataField label="Nachname" value={('last_name' in profile) ? (profile as any).last_name : undefined} />}
            {'gender' in profile && (
              <DataField label="Geschlecht" value={GENDER_LABELS[(profile as any).gender ?? ''] ?? '–'} />
            )}
            {'birthday' in profile && (profile as any).birthday && (
              <DataField
                label="Geburtstag"
                value={new Date((profile as any).birthday).toLocaleDateString('de-DE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            )}
            {'about_me' in profile && profile.about_me && (
              <div className="sm:col-span-2">
                <DataField label="Über mich" value={profile.about_me || '–'} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions for own profile */}
      {isOwnProfile && (
        <div className="flex justify-center">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Daten bearbeiten
          </Link>
        </div>
      )}
    </div>
  );
}

function DataField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm">{value || '–'}</p>
    </div>
  );
}
