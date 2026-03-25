import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useMyProfile, useUpdateMyProfile } from '@/api/profile';

const GENDER_OPTIONS = [
  { value: 'no_answer', label: 'Keine Angabe' },
  { value: 'male', label: 'Männlich' },
  { value: 'female', label: 'Weiblich' },
  { value: 'diverse', label: 'Divers' },
];

export default function EinstellungenPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [scoutName, setScoutName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('no_answer');
  const [birthday, setBirthday] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate('/login');
    }
  }, [user, userLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setScoutName(profile.scout_name);
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setGender(profile.gender);
      setBirthday(profile.birthday || '');
      setAboutMe(profile.about_me);
    }
  }, [profile]);

  function resetForm() {
    if (profile) {
      setScoutName(profile.scout_name);
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setGender(profile.gender);
      setBirthday(profile.birthday || '');
      setAboutMe(profile.about_me);
    }
    setEditing(false);
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
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
          setSaved(true);
          setEditing(false);
        },
      },
    );
  }

  const isLoading = userLoading || profileLoading;

  if (isLoading || !user) {
    return (
      <div className="container py-8 max-w-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-sm text-muted-foreground">Dein Profil und Kontodaten verwalten</p>
        </div>
      </div>

      {/* Account info (read-only) */}
      <div className="bg-card rounded-xl border p-6 mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Konto</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-0.5">E-Mail</label>
            <p className="text-sm">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-0.5">Rolle</label>
            <p className="text-sm">{user.is_staff ? 'Administrator' : 'Mitglied'}</p>
          </div>
        </div>
      </div>

      {/* Profile section */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profil</h2>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setSaved(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Bearbeiten
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="scout_name" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">badge</span>
                Pfadfindername
              </label>
              <input
                id="scout_name"
                type="text"
                value={scoutName}
                onChange={(e) => setScoutName(e.target.value)}
                placeholder="z.B. Flinker Fuchs"
                className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <span className="material-symbols-outlined text-muted-foreground text-[18px]">person</span>
                  Vorname
                </label>
                <input
                  id="first_name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <span className="material-symbols-outlined text-muted-foreground text-[18px]">person</span>
                  Nachname
                </label>
                <input
                  id="last_name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="gender" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">wc</span>
                Geschlecht
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="birthday" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">cake</span>
                Geburtstag
              </label>
              <input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="about_me" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">description</span>
                Über mich
              </label>
              <textarea
                id="about_me"
                rows={3}
                maxLength={500}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Erzähle etwas über dich..."
                className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">{aboutMe.length}/500</p>
            </div>

            {updateProfile.error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {updateProfile.error.message}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="flex items-center gap-2 px-6 py-2.5 gradient-primary text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {updateProfile.isPending ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 border rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {profile?.scout_name && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-0.5">Pfadfindername</label>
                <p className="text-sm">{profile.scout_name}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-0.5">Vorname</label>
                <p className="text-sm">{profile?.first_name || '–'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-0.5">Nachname</label>
                <p className="text-sm">{profile?.last_name || '–'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-0.5">Geschlecht</label>
              <p className="text-sm">
                {GENDER_OPTIONS.find((o) => o.value === profile?.gender)?.label || 'Keine Angabe'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-0.5">Geburtstag</label>
              <p className="text-sm">
                {profile?.birthday
                  ? new Date(profile.birthday).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '–'}
              </p>
            </div>
            {profile?.about_me && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-0.5">Über mich</label>
                <p className="text-sm whitespace-pre-wrap">{profile.about_me}</p>
              </div>
            )}

            {saved && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Profil gespeichert!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
