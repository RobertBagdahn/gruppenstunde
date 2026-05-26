/**
 * PhaseGuidanceBanner — Contextual guidance banner per event phase.
 * Shows status text, action instructions, and relevant links.
 * Replaces the generic "Das Event befindet sich noch im Entwurf" info banner.
 *
 * Colors per phase:
 * - draft: slate/gray
 * - pre_registration: blue
 * - registration: green
 * - pre_event: amber
 * - running: violet
 * - completed: slate
 */
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { EventDetail } from '@/schemas/event';

type EventPhase =
  | 'draft'
  | 'pre_registration'
  | 'registration'
  | 'pre_event'
  | 'running'
  | 'completed';

interface Props {
  event: EventDetail;
  isManager: boolean;
}

// ---------------------------------------------------------------------------
// Phase color configuration
// ---------------------------------------------------------------------------

const PHASE_ALERT_STYLES: Record<EventPhase, {
  bg: string;
  border: string;
  icon: string;
  iconColor: string;
  textColor: string;
}> = {
  draft: {
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    border: 'border-slate-200 dark:border-slate-800',
    icon: 'edit_note',
    iconColor: 'text-slate-600 dark:text-slate-400',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  pre_registration: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'schedule',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  registration: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: 'how_to_reg',
    iconColor: 'text-green-600 dark:text-green-400',
    textColor: 'text-green-700 dark:text-green-300',
  },
  pre_event: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'event_upcoming',
    iconColor: 'text-amber-600 dark:text-amber-400',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  running: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
    icon: 'play_circle',
    iconColor: 'text-violet-600 dark:text-violet-400',
    textColor: 'text-violet-700 dark:text-violet-300',
  },
  completed: {
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    border: 'border-slate-200 dark:border-slate-800',
    icon: 'check_circle',
    iconColor: 'text-slate-500 dark:text-slate-400',
    textColor: 'text-slate-600 dark:text-slate-300',
  },
};

// ---------------------------------------------------------------------------
// Helper: format date in German
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PhaseGuidanceBanner({ event, isManager }: Props) {
  const [, setSearchParams] = useSearchParams();
  const phase = (event.phase || 'draft') as EventPhase;
  const styles = PHASE_ALERT_STYLES[phase];

  const goToTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/events/${event.slug}/register`,
    );
    toast.success('Link kopiert!');
  };

  // Build phase-specific content
  const content = getPhaseContent(event, phase, isManager, goToTab, copyLink);

  if (!content) return null;

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        styles.bg,
        styles.border,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'material-symbols-outlined text-[22px] shrink-0 mt-0.5',
            styles.iconColor,
          )}
        >
          {styles.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', styles.textColor)}>
            {content.status}
          </p>
          {content.action && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {content.action}
            </div>
          )}
          {content.extra && (
            <div className="mt-2">
              {content.extra}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase content builder
// ---------------------------------------------------------------------------

function getPhaseContent(
  event: EventDetail,
  phase: EventPhase,
  isManager: boolean,
  goToTab: (tab: string) => void,
  copyLink: () => void,
): { status: string; action?: React.ReactNode; extra?: React.ReactNode } | null {
  // If manual phase override is set, show notice
  const manualOverride = event.manual_phase ? (
    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
      Phase manuell gesetzt
    </span>
  ) : null;

  switch (phase) {
    case 'draft':
      return {
        status: 'Dein Event ist noch nicht veröffentlicht. Teilnehmer können sich noch nicht anmelden.',
        action: isManager ? (
          <span>
            Konfiguriere dein Event und setze ein{' '}
            <button
              onClick={() => goToTab('settings')}
              className="text-blue-600 hover:underline font-medium"
            >
              Registrierungsdatum
            </button>
            , um die Anmeldung zu aktivieren.
            {manualOverride && <> {manualOverride}</>}
          </span>
        ) : undefined,
      };

    case 'pre_registration':
      return {
        status: `Die Anmeldung beginnt am ${formatDate(event.registration_start)}.`,
        action: isManager ? (
          <span>
            Lade in der Zwischenzeit{' '}
            <button
              onClick={() => goToTab('invitation')}
              className="text-blue-600 hover:underline font-medium"
            >
              Teilnehmer ein
            </button>
            .
            {manualOverride && <> {manualOverride}</>}
          </span>
        ) : undefined,
      };

    case 'registration': {
      const totalCapacity = event.booking_options.reduce(
        (sum, opt) => sum + (opt.max_participants > 0 ? opt.max_participants : 0),
        0,
      );
      const capacityText = totalCapacity > 0
        ? ` ${event.participant_count} von ${totalCapacity} Plätzen belegt.`
        : '';

      return {
        status: `Die Anmeldung ist offen${event.registration_deadline ? ` bis ${formatDate(event.registration_deadline)}` : ''}.${capacityText}`,
        action: isManager ? (
          <span className="flex items-center gap-2 flex-wrap">
            <span>Teile den Anmeldelink mit deiner Gruppe.</span>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border hover:bg-white/50 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              Link kopieren
            </button>
            {manualOverride}
          </span>
        ) : undefined,
      };
    }

    case 'pre_event':
      return {
        status: `Die Anmeldung ist geschlossen. Das Event beginnt am ${formatDate(event.start_date)}.`,
        action: isManager ? (
          <span>
            Überprüfe die{' '}
            <button
              onClick={() => goToTab('participants')}
              className="text-blue-600 hover:underline font-medium"
            >
              Teilnehmerliste
            </button>
            {' '}und{' '}
            <button
              onClick={() => goToTab('payments')}
              className="text-blue-600 hover:underline font-medium"
            >
              Zahlungen
            </button>
            .
            {manualOverride && <> {manualOverride}</>}
          </span>
        ) : undefined,
      };

    case 'running':
      return {
        status: 'Das Event läuft gerade!',
        action: isManager ? (
          <span>
            Nutze das{' '}
            <button
              onClick={() => goToTab('participants')}
              className="text-blue-600 hover:underline font-medium"
            >
              Anwesenheits-Tracking
            </button>
            .
            {manualOverride && <> {manualOverride}</>}
          </span>
        ) : undefined,
      };

    case 'completed':
      return {
        status: 'Das Event ist abgeschlossen.',
        action: isManager ? (
          <span>
            <button
              onClick={() => goToTab('activity')}
              className="text-blue-600 hover:underline font-medium"
            >
              Exportiere Teilnehmerdaten
            </button>
            {' '}und archiviere das Event.
            {manualOverride && <> {manualOverride}</>}
          </span>
        ) : undefined,
      };

    default:
      return null;
  }
}
