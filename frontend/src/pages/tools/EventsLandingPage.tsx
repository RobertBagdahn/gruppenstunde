/**
 * EventsLandingPage — Anonymous-facing landing page for /events.
 *
 * Strategy:
 *  - If public events exist: show a hero + grid of up to 12 public events
 *    with a registration CTA. Event cards link to /events/:slug (public detail).
 *  - If no public events exist: fall back to the marketing-focused ToolLandingPage.
 *
 * Authenticated users are redirected to /events/app (the dashboard) at the router
 * level; this page intentionally stays public and works without login.
 */
import { Link } from 'react-router-dom';
import { usePublicLandingEvents } from '@/api/events';
import type { EventList } from '@/schemas/event';
import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_EVENTS } from '@/lib/toolColors';
import { getEventIcon } from '@/components/events/wizard/IconPicker';
import { getColorBgClass } from '@/components/events/wizard/ColorPicker';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Marketing fallback content (used when no public events are available)
// ---------------------------------------------------------------------------

const MARKETING_PROPS = {
  tool: TOOL_EVENTS,
  subtitle:
    'Plane Sommerlager, Elternabende, Hajk-Wochenenden und Aktionen – mit Teilnehmerverwaltung, Zahlungstracking, Statistiken und Rundmails.',
  longDescription:
    'Der Aktionsmanager hilft dir, alle Arten von Pfadfinder-Events zu organisieren. Von der Einladung über die Buchung bis zur Auswertung: Alles an einem Ort. Verwalte Teilnehmer mit Labels und benutzerdefinierten Feldern, tracke Zahlungen, sende Rundmails und exportiere deine Daten als Excel, CSV oder PDF.',
  features: [
    { icon: 'event', title: 'Aktion erstellen', description: 'Erstelle Aktionen mit Titel, Datum, Ort, Beschreibung und Buchungsoptionen in wenigen Minuten.' },
    { icon: 'group_add', title: 'Teilnehmerverwaltung', description: 'Verwalte Anmeldungen mit Labels, benutzerdefinierten Feldern, Filtern und Suchfunktion.' },
    { icon: 'payments', title: 'Zahlungstracking', description: 'Erfasse Zahlungen per Bar, PayPal oder Überweisung. Sieh auf einen Blick, wer schon bezahlt hat.' },
    { icon: 'mail', title: 'Rundmails', description: 'Sende E-Mails an alle, gefilterte oder ausgewählte Teilnehmer – mit automatischen Platzhaltern.' },
    { icon: 'download', title: 'Export & Statistiken', description: 'Exportiere Teilnehmerlisten als Excel, CSV oder PDF. Nutze Statistiken zu Kapazität und Zahlungen.' },
    { icon: 'timeline', title: 'Aktivitäts-Timeline', description: 'Verfolge alle Änderungen an deiner Aktion in einer chronologischen Timeline.' },
    { icon: 'label', title: 'Labels & Custom Fields', description: 'Ordne Teilnehmern Labels zu und erfasse beliebige Zusatzdaten.' },
    { icon: 'group', title: 'Gruppen einladen', description: 'Lade ganze Pfadfinder-Gruppen oder einzelne Benutzer per Einladung ein.' },
    { icon: 'location_on', title: 'Standortverwaltung', description: 'Speichere und verwalte Veranstaltungsorte mit Adresse und Beschreibung.' },
  ],
  examples: [
    { icon: 'camping', title: 'Sommerlager planen', description: 'Erstelle ein mehrtägiges Lager mit Buchungsoptionen, tracke Zahlungen und exportiere die Teilnehmerliste.' },
    { icon: 'groups', title: 'Elternabend organisieren', description: 'Lade alle Eltern deiner Gruppe ein, tracke Zu- und Absagen, und sende Erinnerungen.' },
    { icon: 'hiking', title: 'Hajk-Wochenende', description: 'Plane ein Wander-Wochenende mit begrenzter Teilnehmerzahl und benutzerdefinierten Feldern.' },
  ],
  faq: [
    { question: 'Brauche ich einen Account?', answer: 'Öffentliche Aktionen können ohne Anmeldung angezeigt werden. Zum Erstellen brauchst du ein kostenloses Konto.' },
    { question: 'Kann ich eine Aktion nur für meine Gruppe sichtbar machen?', answer: 'Ja, du kannst Aktionen auf bestimmte Gruppen beschränken und gezielt Einladungen versenden.' },
    { question: 'Wie funktionieren Buchungsoptionen?', answer: 'Erstelle verschiedene Optionen mit unterschiedlichen Preisen und Limits. Teilnehmer wählen bei der Anmeldung.' },
    { question: 'Kann ich Teilnehmerlisten exportieren?', answer: 'Ja! Export als Excel, CSV oder PDF mit wählbaren Spalten und Filtern.' },
    { question: 'Kann ich Rundmails senden?', answer: 'Ja! An alle, gefilterte oder manuell ausgewählte Teilnehmer. Platzhalter wie {vorname} werden automatisch ersetzt.' },
  ],
  ctaLabel: 'Aktion erstellen',
  ctaRoute: '/events/app/new',
};

// ---------------------------------------------------------------------------
// Public event card (links to /events/:slug, the public detail page)
// ---------------------------------------------------------------------------

function PublicEventCard({ event }: { event: EventList }) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const startFormatted = formatDate(event.start_date);
  const endFormatted = formatDate(event.end_date);
  const dateDisplay =
    startFormatted && endFormatted && startFormatted !== endFormatted
      ? `${startFormatted} – ${endFormatted}`
      : startFormatted || 'Termin folgt';

  const locationDisplay =
    event.event_location?.city || event.event_location?.name || event.location || '';

  const EventIcon = getEventIcon(event.icon || 'tent');
  const colorClass = getColorBgClass(event.color || 'blue');

  return (
    <Link
      to={`/events/${event.slug}`}
      className="block rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 group"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg text-white shrink-0',
            colorClass,
          )}
        >
          <EventIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate group-hover:text-violet-600 transition-colors">
            {event.name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              {dateDisplay}
            </span>
            {locationDisplay && (
              <span className="flex items-center gap-0.5 truncate max-w-[160px]">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                {locationDisplay}
              </span>
            )}
          </div>
          {event.description && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader (prevents spinner flash)
// ---------------------------------------------------------------------------

function LandingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
      <div className="h-10 w-2/3 max-w-md rounded-lg bg-muted animate-pulse" />
      <div className="h-4 w-full max-w-lg mt-3 rounded bg-muted animate-pulse" />
      <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EventsLandingPage() {
  const { data: events, isLoading } = usePublicLandingEvents();

  if (isLoading) {
    return <LandingSkeleton />;
  }

  // Empty state → marketing fallback
  if (!events || events.length === 0) {
    return <ToolLandingPage {...MARKETING_PROPS} />;
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
      {/* Hero */}
      <div className="mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
          Aktuelle Pfadfinder-Aktionen
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl">
          Entdecke Sommerlager, Hajks, Elternabende und weitere öffentliche Aktionen
          von Pfadfindergruppen. Klick auf eine Aktion für Details und Anmeldung.
        </p>
      </div>

      {/* Event grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <PublicEventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Registration CTA */}
      <div className="mt-12 rounded-2xl border bg-gradient-to-br from-violet-50 to-blue-50 p-6 sm:p-8 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold">
          Eigene Aktionen organisieren
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Erstelle kostenlos ein Konto und plane Aktionen für deine Gruppe –
          mit Teilnehmerverwaltung, Zahlungstracking und Rundmails.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
            Kostenlos registrieren
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Anmelden
          </Link>
        </div>
      </div>
    </div>
  );
}
