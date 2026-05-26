/**
 * EventsPage — Dashboard-style event listing for authenticated users.
 * Sections: Quick Actions, Meine Events, Eingeladene Events, statistics.
 * Features: search/filter bar, event cards with color/icon, list/calendar toggle.
 * Route: /events/app
 */
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useCurrentUser } from '@/api/auth';
import { useEvents, useMyInvitedEvents, useEventTemplates } from '@/api/events';
import type { EventList } from '@/schemas/event';
import ErrorDisplay from '@/components/ErrorDisplay';
import { PhaseBadge } from '@/components/events/PhaseBadge';
import { getEventIcon } from '@/components/events/wizard/IconPicker';
import { getColorBgClass } from '@/components/events/wizard/ColorPicker';
import { cn } from '@/lib/utils';
import CalendarView from '@/components/events/CalendarView';
import EmptyState from '@/components/shared/EmptyState';

// ---------------------------------------------------------------------------
// Event Card (with color + icon)
// ---------------------------------------------------------------------------

type EventStatusBadge = {
  label: string;
  icon: string;
  classes: string;
};

/**
 * Determine the single status badge to render on an event card.
 * Priority (highest wins):
 *  1. Registered        → "Angemeldet" (green)
 *  2. Invited, not registered, in pre_registration/registration phase
 *                       → "Anmeldung steht aus" (amber)
 *  3. Not invited, not registered, in registration phase
 *                       → "Anmeldung offen" (violet)
 *  4. otherwise         → null (no status badge, phase badge stays)
 */
function getEventStatusBadge(event: EventList): EventStatusBadge | null {
  if (event.is_registered) {
    return {
      label: 'Angemeldet',
      icon: 'check_circle',
      classes: 'text-green-600',
    };
  }
  if (event.is_invited && (event.phase === 'pre_registration' || event.phase === 'registration')) {
    return {
      label: 'Anmeldung steht aus',
      icon: 'pending_actions',
      classes: 'text-amber-600',
    };
  }
  if (!event.is_invited && event.phase === 'registration') {
    return {
      label: 'Anmeldung offen',
      icon: 'app_registration',
      classes: 'text-violet-500',
    };
  }
  return null;
}

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

  const EventIcon = getEventIcon(event.icon || 'tent');
  const colorClass = getColorBgClass(event.color || 'blue');

  return (
    <button
      onClick={() => navigate(`/events/app/${event.slug}`)}
      className="w-full text-left rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 group"
    >
      {/* Top row: icon + name + phase badge */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg text-white shrink-0',
            colorClass,
          )}
        >
          <EventIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm truncate group-hover:text-violet-600 transition-colors">
              {event.name}
            </h3>
            <PhaseBadge phase={event.phase} />
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
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

          {/* Registration status (single badge, priority-based) */}
          <div className="mt-1.5 flex items-center gap-1.5">
            {(() => {
              const badge = getEventStatusBadge(event);
              if (!badge) return null;
              return (
                <span className={cn('flex items-center gap-1 text-[11px] font-medium', badge.classes)}>
                  <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
                  {badge.label}
                </span>
              );
            })()}
            {event.is_template && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                Vorlage
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Quick Action Card
// ---------------------------------------------------------------------------

function QuickAction({
  icon,
  label,
  onClick,
  color = 'violet',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  color?: 'violet' | 'blue' | 'emerald' | 'amber';
}) {
  const colorMap = {
    violet: 'bg-violet-50 text-violet-600 hover:bg-violet-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm text-left w-full',
        colorMap[color],
      )}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <span className="material-symbols-outlined text-[20px] text-muted-foreground">{icon}</span>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Events Page (Dashboard Layout)
// ---------------------------------------------------------------------------

export default function EventsPage() {
  const { data: user } = useCurrentUser();
  const { data: events, isLoading, error: eventsError, refetch: refetchEvents } = useEvents();
  const { data: invitedEvents } = useMyInvitedEvents();
  const { data: templates } = useEventTemplates();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search filter
  const search = searchParams.get('search') ?? '';
  const setSearch = (v: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set('search', v);
      else next.delete('search');
      return next;
    }, { replace: true });
  };

  // View mode
  const viewMode = (searchParams.get('view') as 'list' | 'calendar') ?? 'list';

  // Filter events by search
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!search) return events;
    const s = search.toLowerCase();
    return events.filter(
      (ev) =>
        ev.name.toLowerCase().includes(s) ||
        (ev.event_location?.name?.toLowerCase().includes(s) ?? false) ||
        (ev.event_location?.city?.toLowerCase().includes(s) ?? false) ||
        (ev.location?.toLowerCase().includes(s) ?? false),
    );
  }, [events, search]);

  // Statistics
  const totalEvents = events?.length ?? 0;
  const totalParticipants = events?.reduce((sum, ev) => sum + ev.participant_count, 0) ?? 0;
  const upcomingEvents =
    events?.filter((ev) => {
      if (!ev.start_date) return false;
      return new Date(ev.start_date) > new Date();
    }).length ?? 0;

  // Template events from paginated response
  const templateEvents = templates?.items ?? [];

  return (
    <EntityLinkContext.Provider value="list">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <span className="material-symbols-outlined text-[22px]">celebration</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Aktionen</h1>
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

      {/* Quick Actions */}
      {user && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <QuickAction
            icon="add_circle"
            label="Neues Event"
            onClick={() => navigate('/events/app/new')}
            color="violet"
          />
          <QuickAction
            icon="content_copy"
            label="Vorlagen"
            onClick={() => {
              const el = document.getElementById('templates-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            color="amber"
          />
          <QuickAction
            icon="mail"
            label="Eingeladene Events"
            onClick={() => {
              const el = document.getElementById('invited-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            color="blue"
          />
          <QuickAction
            icon="person"
            label="Meine Personen"
            onClick={() => navigate('/events/app/persons')}
            color="emerald"
          />
        </div>
      )}

      {/* Statistics */}
      {user && events && events.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon="celebration" label="Events" value={totalEvents} />
          <StatCard icon="group" label="Teilnehmer" value={totalParticipants} />
          <StatCard icon="event_upcoming" label="Bevorstehend" value={upcomingEvents} />
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex gap-2 mb-4 items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined text-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            search
          </span>
          <input
            type="text"
            placeholder="Events suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        {/* View mode toggle */}
        <div className="flex border rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('view', 'list');
              return next;
            }, { replace: true })}
            className={cn(
              'px-2.5 py-2 transition-colors',
              viewMode === 'list' ? 'bg-violet-100 text-violet-700' : 'hover:bg-muted text-muted-foreground',
            )}
            title="Listenansicht"
          >
            <span className="material-symbols-outlined text-[18px]">view_list</span>
          </button>
          <button
            onClick={() => setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('view', 'calendar');
              return next;
            }, { replace: true })}
            className={cn(
              'px-2.5 py-2 transition-colors',
              viewMode === 'calendar' ? 'bg-violet-100 text-violet-700' : 'hover:bg-muted text-muted-foreground',
            )}
            title="Kalenderansicht"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          </button>
        </div>
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

      {/* Calendar View */}
      {viewMode === 'calendar' && events && (
        <div className="mb-6">
          <CalendarView events={events} />
        </div>
      )}

      {/* Meine Events — List View */}
      {viewMode === 'list' && filteredEvents && filteredEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">celebration</span>
            Meine Events
            {search && (
              <span className="text-xs text-muted-foreground font-normal">
                ({filteredEvents.length} von {events?.length ?? 0})
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}

      {/* Eingeladene Events */}
      {invitedEvents && invitedEvents.length > 0 && (
        <section id="invited-section" className="mb-8">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">mail</span>
            Eingeladene Events
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {invitedEvents.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}

      {/* Vorlagen */}
      {templateEvents.length > 0 && (
        <section id="templates-section" className="mb-8">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            Vorlagen
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {templateEvents.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {viewMode === 'list' && events && events.length === 0 && (
        <EmptyState
          icon="celebration"
          title="Keine Events vorhanden"
          description="Erstelle dein erstes Event, um loszulegen."
          ctaLabel={user ? 'Erstes Event erstellen' : undefined}
          ctaHref={user ? '/events/app/new' : undefined}
        />
      )}

      {/* No search results */}
      {viewMode === 'list' && search && filteredEvents.length === 0 && (events?.length ?? 0) > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block">search_off</span>
          Keine Events für &quot;{search}&quot; gefunden
        </div>
      )}
    </div>
    </EntityLinkContext.Provider>
  );
}
