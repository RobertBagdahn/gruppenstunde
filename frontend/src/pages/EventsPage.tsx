import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useEvents } from '@/api/events';
import type { EventList } from '@/schemas/event';
import ErrorDisplay from '@/components/ErrorDisplay';
import { PhaseBadge } from '@/components/events/PhaseBadge';

// ---------------------------------------------------------------------------
// Event Card (Compact)
// ---------------------------------------------------------------------------

function EventCard({ event }: { event: EventList }) {
  const navigate = useNavigate();

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
      : startFormatted || 'Kein Datum';

  const locationDisplay =
    event.event_location?.city || event.event_location?.name || event.location || '';

  return (
    <button
      onClick={() => navigate(`/events/app/${event.slug}`)}
      className="w-full text-left rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 group"
    >
      {/* Top row: name + phase badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm truncate group-hover:text-violet-600 transition-colors">
          {event.name}
        </h3>
        <PhaseBadge phase={event.phase} />
      </div>

      {/* Info row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          {dateDisplay}
        </span>
        {locationDisplay && (
          <span className="flex items-center gap-0.5 truncate max-w-[120px]">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {locationDisplay}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[14px]">group</span>
          {event.participant_count}
        </span>
      </div>

      {/* Registration status */}
      <div className="mt-2 flex items-center gap-1.5">
        {event.is_registered ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-green-600">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Angemeldet
          </span>
        ) : (
          event.phase === 'registration' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-violet-500">
              <span className="material-symbols-outlined text-[14px]">app_registration</span>
              Anmeldung offen
            </span>
          )
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Events Page (List)
// ---------------------------------------------------------------------------

export default function EventsPage() {
  const { data: user } = useCurrentUser();
  const { data: events, isLoading, error: eventsError, refetch: refetchEvents } = useEvents();
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <span className="material-symbols-outlined text-[22px]">celebration</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Veranstaltungen</h1>
            <p className="text-xs text-muted-foreground">
              Lager, Elternabende und Aktionen verwalten
            </p>
          </div>
        </div>
        {user && (
          <button
            onClick={() => navigate('/events/app/new')}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">Neues Event</span>
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse h-32 bg-muted rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {eventsError && (
        <ErrorDisplay error={eventsError} variant="inline" onRetry={() => refetchEvents()} />
      )}

      {/* Event Grid */}
      {events && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {events && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <span className="material-symbols-outlined text-[48px] mb-3">celebration</span>
          <p className="text-sm">Keine Events verfügbar.</p>
          {user && (
            <button
              onClick={() => navigate('/events/app/new')}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium"
            >
              Erstes Event erstellen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
