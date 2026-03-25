import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useMyPreferences, useUpdateMyPreferences } from '@/api/profile';

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: prefs, isLoading: prefsLoading } = useMyPreferences();
  const updatePrefs = useUpdateMyPreferences();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [difficulty, setDifficulty] = useState('');
  const [location, setLocation] = useState('');
  const [groupSizeMin, setGroupSizeMin] = useState<number | null>(null);
  const [groupSizeMax, setGroupSizeMax] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate('/login');
    }
  }, [user, userLoading, navigate]);

  useEffect(() => {
    if (prefs) {
      setDifficulty(prefs.preferred_difficulty);
      setLocation(prefs.preferred_location);
      setGroupSizeMin(prefs.preferred_group_size_min);
      setGroupSizeMax(prefs.preferred_group_size_max);
    }
  }, [prefs]);

  function resetForm() {
    if (prefs) {
      setDifficulty(prefs.preferred_difficulty);
      setLocation(prefs.preferred_location);
      setGroupSizeMin(prefs.preferred_group_size_min);
      setGroupSizeMax(prefs.preferred_group_size_max);
    }
    setEditing(false);
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    updatePrefs.mutate(
      {
        preferred_difficulty: difficulty,
        preferred_location: location,
        preferred_group_size_min: groupSizeMin,
        preferred_group_size_max: groupSizeMax,
      },
      {
        onSuccess: () => {
          setSaved(true);
          setEditing(false);
        },
      },
    );
  }

  const isLoading = userLoading || prefsLoading;

  if (isLoading || !user) {
    return (
      <div className="container py-8 max-w-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const difficultyLabel: Record<string, string> = {
    easy: 'Einfach',
    medium: 'Mittel',
    hard: 'Schwer',
  };
  const locationLabel: Record<string, string> = {
    indoor: 'Drinnen',
    outdoor: 'Draußen',
  };

  return (
    <div className="container py-8 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[24px]">tune</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Bevorzugte Einstellungen</h1>
          <p className="text-sm text-muted-foreground">Standard-Filter für die Ideen-Suche</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Suchpräferenzen</h2>
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
              <label htmlFor="difficulty" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">signal_cellular_alt</span>
                Bevorzugte Schwierigkeit
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Keine Präferenz</option>
                <option value="easy">Einfach</option>
                <option value="medium">Mittel</option>
                <option value="hard">Schwer</option>
              </select>
            </div>

            <div>
              <label htmlFor="location" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">location_on</span>
                Bevorzugter Ort
              </label>
              <select
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Keine Präferenz</option>
                <option value="indoor">Drinnen</option>
                <option value="outdoor">Draußen</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="group_min" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <span className="material-symbols-outlined text-muted-foreground text-[18px]">group</span>
                  Min. Gruppengröße
                </label>
                <input
                  id="group_min"
                  type="number"
                  min={1}
                  value={groupSizeMin ?? ''}
                  onChange={(e) => setGroupSizeMin(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="group_max" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <span className="material-symbols-outlined text-muted-foreground text-[18px]">group</span>
                  Max. Gruppengröße
                </label>
                <input
                  id="group_max"
                  type="number"
                  min={1}
                  value={groupSizeMax ?? ''}
                  onChange={(e) => setGroupSizeMax(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {updatePrefs.error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {updatePrefs.error.message}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={updatePrefs.isPending}
                className="flex items-center gap-2 px-6 py-2.5 gradient-primary text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {updatePrefs.isPending ? 'Speichern...' : 'Speichern'}
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
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-0.5">Bevorzugte Schwierigkeit</label>
              <p className="text-sm">{difficultyLabel[prefs?.preferred_difficulty || ''] || 'Keine Präferenz'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-0.5">Bevorzugter Ort</label>
              <p className="text-sm">{locationLabel[prefs?.preferred_location || ''] || 'Keine Präferenz'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-0.5">Min. Gruppengröße</label>
                <p className="text-sm">{prefs?.preferred_group_size_min ?? '–'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-0.5">Max. Gruppengröße</label>
                <p className="text-sm">{prefs?.preferred_group_size_max ?? '–'}</p>
              </div>
            </div>

            {saved && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Einstellungen gespeichert!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
