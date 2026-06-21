/**
 * Privacy Page — GDPR data overview, export, and account deletion.
 * Route: /profile/privacy
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import { useDataOverview, useDataExport, useDeleteAccount } from '@/api/privacy';
import { cn } from '@/lib/utils';
import type { Category } from '@/schemas/privacy';

/* ------------------------------------------------------------------ */
/*  Data Category Card (collapsible)                                   */
/* ------------------------------------------------------------------ */

interface DataCategoryProps {
  icon: string;
  label: string;
  count: number;
  items: Record<string, unknown>[];
}

function DataCategory({ icon, label, count, items }: DataCategoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
          <span className="material-symbols-outlined text-[18px] text-muted-foreground transition-transform">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </button>
      {open && items.length > 0 && (
        <div className="px-4 pb-3 border-t border-border/40">
          <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
            {items.slice(0, 50).map((item, i) => (
              <div key={i} className="text-xs text-muted-foreground py-1 border-b border-border/20 last:border-0">
                {Object.entries(item)
                  .filter(([k]) => !k.startsWith('id') && k !== 'type')
                  .map(([k, v]) => (
                    <span key={k} className="mr-3">
                      <span className="font-medium text-foreground">{k}:</span>{' '}
                      {String(v ?? '—')}
                    </span>
                  ))}
              </div>
            ))}
            {items.length > 50 && (
              <p className="text-xs text-muted-foreground pt-1">
                ... und {items.length - 50} weitere Einträge (im Export enthalten)
              </p>
            )}
          </div>
        </div>
      )}
      {open && items.length === 0 && (
        <div className="px-4 pb-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground mt-2">Keine Daten vorhanden.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Account Dialog                                              */
/* ------------------------------------------------------------------ */

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  hasPassword: boolean;
}

function DeleteAccountDialog({ open, onClose, hasPassword }: DeleteDialogProps) {
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccount();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [step, setStep] = useState(1);

  const isConfirmationValid = confirmation === 'KONTO LÖSCHEN';
  const isPasswordValid = hasPassword ? password.length > 0 : true;
  const canDelete = isConfirmationValid && isPasswordValid;

  const handleDelete = () => {
    deleteAccount.mutate(
      {
        password: hasPassword ? password : null,
        confirmation: confirmation as 'KONTO LÖSCHEN',
      },
      {
        onSuccess: () => {
          toast.success('Dein Konto wurde gelöscht');
          onClose();
          navigate('/');
        },
        onError: (err) => {
          toast.error('Fehler', { description: err.message });
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive">
            <span className="material-symbols-outlined">warning</span>
          </span>
          <h2 className="text-lg font-bold text-destructive">Konto löschen</h2>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Diese Aktion kann nicht rückgängig gemacht werden. Folgende Daten werden gelöscht oder anonymisiert:
            </p>
            <ul className="text-sm space-y-1.5 text-foreground">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-destructive">remove_circle</span>
                Profildaten, Profilbild und Einstellungen
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-destructive">remove_circle</span>
                Personendaten und Event-Teilnahmen (anonymisiert)
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-destructive">remove_circle</span>
                Kommentare (Name wird anonymisiert, Text bleibt)
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-destructive">remove_circle</span>
                Planer, Packlisten und Einkaufslisten
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-destructive">remove_circle</span>
                Analytics-Daten (Views, Suchanfragen)
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Erstellte Inhalte (Gruppenstunden, Rezepte, etc.) bleiben ohne Autorenangabe erhalten.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Weiter
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {hasPassword && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Passwort bestätigen</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Dein aktuelles Passwort"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
                />
              </div>
            )}
            {!hasPassword && (
              <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                Dein Konto hat kein Passwort (Gast-Account). Keine Passwort-Bestätigung nötig.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Tippe <span className="font-bold text-destructive">KONTO LÖSCHEN</span> zum Bestätigen
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="KONTO LÖSCHEN"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
              >
                Zurück
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleteAccount.isPending}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  canDelete && !deleteAccount.isPending
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {deleteAccount.isPending ? 'Wird gelöscht...' : 'Konto endgültig löschen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Privacy Page                                                  */
/* ------------------------------------------------------------------ */

export default function PrivacyPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const { data, isLoading, error } = useDataOverview();
  const dataExport = useDataExport();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate('/login');
    }
  }, [user, userLoading, navigate]);

  if (userLoading || isLoading) {
    return (
      <div className="container max-w-2xl py-8 space-y-4">
        <div className="h-8 bg-muted rounded-lg animate-pulse w-64" />
        <div className="h-4 bg-muted rounded animate-pulse w-48" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm">
          Fehler beim Laden der Daten: {error.message}
        </div>
      </div>
    );
  }

  if (!data || !user) return null;

  const categories: { icon: string; label: string; data: Category }[] = [
    { icon: 'person', label: 'Gruppenmitgliedschaften', data: data.groups },
    { icon: 'family_restroom', label: 'Personen (Event-Kontakte)', data: data.persons },
    { icon: 'celebration', label: 'Event-Teilnahmen', data: data.events },
    { icon: 'lightbulb', label: 'Erstellte Inhalte', data: data.content },
    { icon: 'chat', label: 'Kommentare', data: data.comments },
    { icon: 'favorite', label: 'Reaktionen / Emotionen', data: data.interactions },
    { icon: 'calendar_month', label: 'Planung (Planer)', data: data.planning },
    { icon: 'backpack', label: 'Packlisten', data: data.packing_lists },
  ];

  return (
    <div className="container max-w-2xl py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meine Daten & Datenschutz</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hier siehst du alle Daten, die wir über dich gespeichert haben. Du kannst sie exportieren oder dein Konto löschen.
        </p>
      </div>

      {/* Section 1: Data Overview */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px]">database</span>
          Datenübersicht
        </h2>

        {/* Profile Summary */}
        <div className="bg-card rounded-xl border p-4 mb-3">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-muted-foreground">account_circle</span>
            Profildaten
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">E-Mail</span>
            <span>{String(data.profile.email ?? '—')}</span>
            <span className="text-muted-foreground">Pfadfindername</span>
            <span>{String(data.profile.scout_name ?? '—')}</span>
            <span className="text-muted-foreground">Name</span>
            <span>{String(data.profile.first_name ?? '')} {String(data.profile.last_name ?? '')}</span>
            <span className="text-muted-foreground">Geschlecht</span>
            <span>{String(data.profile.gender ?? '—')}</span>
            <span className="text-muted-foreground">Geburtstag</span>
            <span>{String(data.profile.birthday ?? '—')}</span>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="bg-card rounded-xl border p-4 mb-3">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-muted-foreground">analytics</span>
            Analytics-Daten
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Gespeicherte Seitenaufrufe</span>
            <span>{data.analytics.view_count}</span>
            <span className="text-muted-foreground">Gespeicherte Suchanfragen</span>
            <span>{data.analytics.search_count}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            IP-Adressen werden nur als Hash gespeichert (nicht im Klartext).
          </p>
        </div>

        {/* Collapsible Categories */}
        <div className="space-y-2">
          {categories.map((cat) => (
            <DataCategory
              key={cat.label}
              icon={cat.icon}
              label={cat.label}
              count={cat.data.count}
              items={cat.data.items}
            />
          ))}
        </div>
      </section>

      {/* Section 2: Data Export */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px]">download</span>
          Daten exportieren
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Lade alle deine gespeicherten Daten als JSON-Datei herunter (DSGVO Art. 20 — Recht auf Datenübertragbarkeit).
        </p>
        <button
          onClick={() =>
            dataExport.mutate(undefined, {
              onSuccess: () => toast.success('Export wurde heruntergeladen'),
              onError: (err) => toast.error('Export fehlgeschlagen', { description: err.message }),
            })
          }
          disabled={dataExport.isPending}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'shadow-[0_2px_8px_-2px_hsl(198_78%_42%_/_0.4)]',
            dataExport.isPending && 'opacity-60 cursor-not-allowed'
          )}
        >
          <span className="material-symbols-outlined text-[20px]">
            {dataExport.isPending ? 'hourglass_empty' : 'download'}
          </span>
          {dataExport.isPending ? 'Wird exportiert...' : 'Alle meine Daten herunterladen (JSON)'}
        </button>
      </section>

      {/* Section 3: Delete Account */}
      <section className="bg-destructive/5 border border-destructive/20 rounded-xl p-6">
        <h2 className="text-lg font-bold text-destructive mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px]">delete_forever</span>
          Konto löschen
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Dein Konto und alle damit verbundenen Daten werden unwiderruflich gelöscht oder anonymisiert.
          Erstellte Inhalte bleiben ohne Autorenangabe erhalten.
        </p>
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">delete_forever</span>
          Konto löschen
        </button>
      </section>

      {/* Delete Dialog */}
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        hasPassword={true}
      />
    </div>
  );
}
