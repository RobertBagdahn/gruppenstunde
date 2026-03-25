import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useQueryClient } from '@tanstack/react-query';

interface ProfileData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

export default function NamePage() {
  const { data: user, isLoading } = useCurrentUser();
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const targetUserId = userId ? Number(userId) : user?.id;
  const isOwnProfile = !userId || Number(userId) === user?.id;
  const canEdit = isOwnProfile || user?.is_staff;

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  // Load profile data
  useEffect(() => {
    if (!user || !targetUserId) return;

    if (isOwnProfile) {
      setProfile({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_staff: user.is_staff,
      });
      setFirstName(user.first_name);
      setLastName(user.last_name);
    } else if (user.is_staff) {
      setProfileLoading(true);
      fetch(`/api/users/${targetUserId}/`, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error('Fehler beim Laden');
          return res.json();
        })
        .then((data: ProfileData) => {
          setProfile(data);
          setFirstName(data.first_name);
          setLastName(data.last_name);
        })
        .catch(() => setError('Profil konnte nicht geladen werden'))
        .finally(() => setProfileLoading(false));
    } else {
      navigate('/profile/name');
    }
  }, [user, targetUserId, isOwnProfile, navigate]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserId) return;
    setSaving(true);
    setSaved(false);
    setError('');

    const res = await fetch(`/api/users/${targetUserId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    });

    if (res.ok) {
      const data: ProfileData = await res.json();
      setProfile(data);
      setSaved(true);
      setEditing(false);
      if (isOwnProfile) {
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      }
    } else {
      setError('Speichern fehlgeschlagen');
    }
    setSaving(false);
  }

  if (isLoading || profileLoading || !profile) {
    return (
      <div className="container py-8 max-w-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container py-8 max-w-xl">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[24px]">badge</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {isOwnProfile ? 'Mein Name' : `Profil von ${profile.first_name || profile.email}`}
          </h1>
          <p className="text-sm text-muted-foreground">Name und Kontaktdaten</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Persönliche Daten</h2>
          {canEdit && !editing && (
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
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">email</span>
                E-Mail
              </label>
              <p className="text-sm text-muted-foreground px-4 py-2.5">{profile.email}</p>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 gradient-primary text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFirstName(profile.first_name);
                  setLastName(profile.last_name);
                  setError('');
                }}
                className="px-6 py-2.5 border rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-0.5">Vorname</label>
                <p className="text-sm">{profile.first_name || '–'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-0.5">Nachname</label>
                <p className="text-sm">{profile.last_name || '–'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-0.5">E-Mail</label>
              <p className="text-sm">{profile.email}</p>
            </div>

            {saved && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Gespeichert!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
