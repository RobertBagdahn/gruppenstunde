import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import {
  useMyProfile,
  useMyPreferences,
  useUpdateMyProfile,
  useUpdateMyPreferences,
  useUploadProfilePicture,
  useDeleteProfilePicture,
} from '@/api/profile';
import { calculateProfileCompleteness } from '@/lib/profileCompleteness';
import WhatsAppConnectionCard from '@/components/whatsapp/WhatsAppConnectionCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Einfach',
  medium: 'Mittel',
  hard: 'Schwer',
};

const LOCATION_LABELS: Record<string, string> = {
  indoor: 'Drinnen',
  outdoor: 'Draußen',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Männlich',
  female: 'Weiblich',
  diverse: 'Divers',
  no_answer: 'Keine Angabe',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: preferences, isLoading: prefsLoading } = useMyPreferences();
  const updateProfile = useUpdateMyProfile();
  const updatePrefs = useUpdateMyPreferences();
  const uploadPicture = useUploadProfilePicture();
  const deletePicture = useDeleteProfilePicture();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit-mode state per section
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);

  // Profile form state
  const [scoutName, setScoutName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [aboutMe, setAboutMe] = useState('');

  // Preferences form state
  const [difficulty, setDifficulty] = useState('');
  const [location, setLocation] = useState('');
  const [groupSizeMin, setGroupSizeMin] = useState<string>('');
  const [groupSizeMax, setGroupSizeMax] = useState<string>('');

  useEffect(() => {
    if (!userLoading && !user) navigate('/login');
  }, [user, userLoading, navigate]);

  // Sync profile form state when entering edit mode
  function enterProfileEdit() {
    if (profile) {
      setScoutName(profile.scout_name);
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setGender(profile.gender);
      setBirthday(profile.birthday ?? '');
      setAboutMe(profile.about_me);
    }
    setEditingProfile(true);
  }

  function enterPrefsEdit() {
    if (preferences) {
      setDifficulty(preferences.preferred_difficulty);
      setLocation(preferences.preferred_location);
      setGroupSizeMin(preferences.preferred_group_size_min?.toString() ?? '');
      setGroupSizeMax(preferences.preferred_group_size_max?.toString() ?? '');
    }
    setEditingPrefs(true);
  }

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate(
      {
        scout_name: scoutName,
        first_name: firstName,
        last_name: lastName,
        gender,
        birthday: birthday || null,
        about_me: aboutMe,
      },
      {
        onSuccess: () => {
          setEditingProfile(false);
          toast.success('Profil aktualisiert');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  function handlePrefsSave(e: React.FormEvent) {
    e.preventDefault();
    updatePrefs.mutate(
      {
        preferred_difficulty: difficulty || undefined,
        preferred_location: location || undefined,
        preferred_group_size_min: groupSizeMin ? Number(groupSizeMin) : null,
        preferred_group_size_max: groupSizeMax ? Number(groupSizeMax) : null,
      },
      {
        onSuccess: () => {
          setEditingPrefs(false);
          toast.success('Suchpräferenzen aktualisiert');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Nur JPEG, PNG und WebP Bilder sind erlaubt');
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error('Maximale Dateigröße: 500 KB');
      return;
    }

    uploadPicture.mutate(file, {
      onSuccess: () => toast.success('Profilbild aktualisiert'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });

    // Reset file input so the same file can be re-selected
    e.target.value = '';
  }

  function handleDeletePicture() {
    deletePicture.mutate(undefined, {
      onSuccess: () => toast.success('Profilbild entfernt'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  }

  function handleIsPublicToggle(checked: boolean) {
    updateProfile.mutate(
      { is_public: checked },
      {
        onSuccess: () =>
          toast.success(checked ? 'Profil ist jetzt öffentlich sichtbar' : 'Profil ist jetzt privat'),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  const isLoading = userLoading || profileLoading || prefsLoading;

  if (isLoading || !user) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="animate-pulse space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted" />
            <div className="h-6 bg-muted rounded w-48" />
          </div>
          <div className="h-40 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const displayName = profile?.scout_name
    ? `${profile.first_name || user.first_name} "${profile.scout_name}" ${profile.last_name || user.last_name}`
    : `${profile?.first_name || user.first_name} ${profile?.last_name || user.last_name}`;

  const initials = (
    (profile?.first_name || user.first_name || '').charAt(0) +
    (profile?.last_name || user.last_name || '').charAt(0)
  ).toUpperCase() || '?';

  const completeness = calculateProfileCompleteness(profile, preferences);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      {/* ================================================================ */}
      {/* Profil-Header Card */}
      {/* ================================================================ */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Avatar with upload */}
            <div className="relative group">
              <Avatar
                className="w-24 h-24 cursor-pointer ring-2 ring-primary/20 ring-offset-2"
                onClick={handleAvatarClick}
              >
                <AvatarImage src={profile?.profile_picture_url ?? undefined} alt={displayName} />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-[hsl(174,60%,41%)] text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleAvatarClick}
              >
                <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {profile?.profile_picture_url && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={handleDeletePicture}
                disabled={deletePicture.isPending}
              >
                <span className="material-symbols-outlined text-[14px] mr-1">delete</span>
                Bild entfernen
              </Button>
            )}

            <div>
              <h1 className="text-xl font-bold">{displayName}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {memberSince && (
                <p className="text-xs text-muted-foreground mt-1">Mitglied seit {memberSince}</p>
              )}
            </div>

            {/* Completeness */}
            <div className="w-full max-w-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profil-Vollständigkeit</span>
                <span className="font-medium">{completeness.percentage}%</span>
              </div>
              <Progress value={completeness.percentage} className="h-2" />
              {completeness.missingFields.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Fehlt: {completeness.missingFields.join(', ')}
                </p>
              )}
            </div>

            {/* is_public toggle */}
            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="is-public"
                checked={profile?.is_public ?? false}
                onCheckedChange={handleIsPublicToggle}
                disabled={updateProfile.isPending}
              />
              <Label htmlFor="is-public" className="text-sm cursor-pointer">
                Profil öffentlich
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Dein Pfadfindername und &quot;Über mich&quot; sind für andere sichtbar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Persönliche Daten Card */}
      {/* ================================================================ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">person</span>
            Persönliche Daten
          </CardTitle>
          {!editingProfile && (
            <Button variant="ghost" size="sm" onClick={enterProfileEdit}>
              <span className="material-symbols-outlined text-[16px] mr-1">edit</span>
              Bearbeiten
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingProfile ? (
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scout-name">Pfadfindername</Label>
                  <Input
                    id="scout-name"
                    value={scoutName}
                    onChange={(e) => setScoutName(e.target.value)}
                    placeholder="z.B. Akela"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Geschlecht</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Männlich</SelectItem>
                      <SelectItem value="female">Weiblich</SelectItem>
                      <SelectItem value="diverse">Divers</SelectItem>
                      <SelectItem value="no_answer">Keine Angabe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">Vorname</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Nachname</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Geburtstag</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="about-me">Über mich</Label>
                <Textarea
                  id="about-me"
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Erzähle etwas über dich..."
                />
                <p className="text-xs text-muted-foreground text-right">{aboutMe.length}/500</p>
              </div>

              {updateProfile.error && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {updateProfile.error.message}
                </p>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Speichern...' : 'Speichern'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProfile(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProfileField label="Pfadfindername" value={profile?.scout_name} />
              <ProfileField label="Geschlecht" value={GENDER_LABELS[profile?.gender ?? ''] ?? '–'} />
              <ProfileField label="Vorname" value={profile?.first_name} />
              <ProfileField label="Nachname" value={profile?.last_name} />
              <ProfileField
                label="Geburtstag"
                value={
                  profile?.birthday
                    ? new Date(profile.birthday).toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : undefined
                }
              />
              <div className="sm:col-span-2">
                <ProfileField label="Über mich" value={profile?.about_me} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Suchpräferenzen Card */}
      {/* ================================================================ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
            Suchpräferenzen
          </CardTitle>
          {!editingPrefs && (
            <Button variant="ghost" size="sm" onClick={enterPrefsEdit}>
              <span className="material-symbols-outlined text-[16px] mr-1">edit</span>
              Bearbeiten
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingPrefs ? (
            <form onSubmit={handlePrefsSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pref-difficulty">Schwierigkeit</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger id="pref-difficulty">
                      <SelectValue placeholder="Keine Präferenz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Einfach</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="hard">Schwer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pref-location">Ort</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger id="pref-location">
                      <SelectValue placeholder="Keine Präferenz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Drinnen</SelectItem>
                      <SelectItem value="outdoor">Draußen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pref-group-min">Min. Gruppengröße</Label>
                  <Input
                    id="pref-group-min"
                    type="number"
                    min={1}
                    value={groupSizeMin}
                    onChange={(e) => setGroupSizeMin(e.target.value)}
                    placeholder="–"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pref-group-max">Max. Gruppengröße</Label>
                  <Input
                    id="pref-group-max"
                    type="number"
                    min={1}
                    value={groupSizeMax}
                    onChange={(e) => setGroupSizeMax(e.target.value)}
                    placeholder="–"
                  />
                </div>
              </div>

              {updatePrefs.error && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {updatePrefs.error.message}
                </p>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={updatePrefs.isPending}>
                  {updatePrefs.isPending ? 'Speichern...' : 'Speichern'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPrefs(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProfileField
                label="Schwierigkeit"
                value={DIFFICULTY_LABELS[preferences?.preferred_difficulty ?? '']}
              />
              <ProfileField
                label="Ort"
                value={LOCATION_LABELS[preferences?.preferred_location ?? '']}
              />
              <ProfileField
                label="Min. Gruppengröße"
                value={preferences?.preferred_group_size_min?.toString()}
              />
              <ProfileField
                label="Max. Gruppengröße"
                value={preferences?.preferred_group_size_max?.toString()}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* WhatsApp-Verbindung Card */}
      {/* ================================================================ */}
      <WhatsAppConnectionCard />

      {/* ================================================================ */}
      {/* Schnellzugriff Card */}
      {/* ================================================================ */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">grid_view</span>
            Schnellzugriff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickLink to="/profile/groups" icon="groups" label="Gruppen" />
            <QuickLink to="/profile/persons" icon="family_restroom" label="Personen" />
            <QuickLink to="/profile/privacy" icon="shield" label="Datenschutz" />
            {user && (
              <QuickLink
                to={`/user/${user.id}`}
                icon="visibility"
                label="Vorschau"
                subtitle="So sehen andere dich"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm">{value || '–'}</p>
    </div>
  );
}

function QuickLink({
  to,
  icon,
  label,
  subtitle,
}: {
  to: string;
  icon: string;
  label: string;
  subtitle?: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:-translate-y-0.5 transition-all min-h-[88px] justify-center"
    >
      <span className="material-symbols-outlined text-primary text-[24px]">{icon}</span>
      <span className="text-sm font-medium text-center">{label}</span>
      {subtitle && (
        <span className="text-xs text-muted-foreground text-center leading-tight">{subtitle}</span>
      )}
    </Link>
  );
}
