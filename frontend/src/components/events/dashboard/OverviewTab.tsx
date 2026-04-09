/**
 * OverviewTab — KPI cards, contact persons, recent timeline, quick actions,
 * mini registration chart, and compact stats.
 * Members see: registration status card, phase timeline, event summary, contacts, participant stats.
 * Managers see: KPI cards, invitation summary, recent timeline, registration chart.
 */
import type { EventDetail } from '@/schemas/event';
import { useEventTimeline } from '@/api/eventDashboard';
import { useEventStats } from '@/api/eventDashboard';
import { useSearchParams } from 'react-router-dom';

interface Props {
  event: EventDetail;
  isManager: boolean;
}

export default function OverviewTab({ event, isManager }: Props) {
  const { data: timeline } = useEventTimeline(event.slug, { page: 1 });
  const { data: stats } = useEventStats(event.slug);
  const [, setSearchParams] = useSearchParams();

  // Calculate KPIs
  const totalParticipants = event.participant_count;
  const totalCapacity = event.booking_options.reduce(
    (sum, opt) => sum + (opt.max_participants > 0 ? opt.max_participants : 0),
    0,
  );
  const totalExpected = event.booking_options.reduce(
    (sum, opt) => sum + opt.current_participant_count * parseFloat(opt.price),
    0,
  );

  const recentTimeline = (timeline || []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Registration Status Card (member) */}
      <RegistrationStatusCard event={event} onGoToRegistration={() => setSearchParams({ tab: 'registration' }, { replace: true })} />

      {/* KPI Cards (manager) */}
      {isManager && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            icon="group"
            label="Teilnehmer"
            value={String(totalParticipants)}
            subtitle={totalCapacity > 0 ? `von ${totalCapacity} Plätzen` : 'keine Obergrenze'}
            color="violet"
          />
          <KpiCard
            icon="payments"
            label="Einnahmen"
            value={`${totalExpected.toFixed(2)}\u20AC`}
            subtitle="erwartet"
            color="emerald"
          />
          <KpiCard
            icon="calendar_today"
            label="Buchungsoptionen"
            value={String(event.booking_options.length)}
            subtitle={
              event.registration_deadline
                ? `Deadline: ${new Date(event.registration_deadline).toLocaleDateString('de-DE')}`
                : 'kein Anmeldeschluss'
            }
            color="amber"
          />
        </div>
      )}

      {/* Invitation summary (manager) */}
      {isManager && event.invitation_counts && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Einladungen
          </h3>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600">{event.invitation_counts.total}</p>
              <p className="text-xs text-muted-foreground">Eingeladen</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{event.invitation_counts.accepted}</p>
              <p className="text-xs text-muted-foreground">Zugesagt</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{event.invitation_counts.pending}</p>
              <p className="text-xs text-muted-foreground">Offen</p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Persons */}
      {event.responsible_persons_detail.length > 0 && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">person</span>
            Kontaktpersonen
          </h3>
          <div className="space-y-2">
            {event.responsible_persons_detail.map((person) => (
              <div key={person.id} className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold">
                  {person.first_name?.[0]}
                  {person.last_name?.[0]}
                </div>
                <div>
                  <p className="font-medium">
                    {person.first_name} {person.last_name}
                  </p>
                  <p className="text-muted-foreground text-xs">{person.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Info (non-manager) */}
      {!isManager && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-3">Event-Details</h3>
          {event.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          )}
          {event.booking_options.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Buchungsoptionen
              </h4>
              <div className="space-y-2">
                {event.booking_options.map((opt) => (
                  <div key={opt.id} className="flex justify-between items-center text-sm border rounded-lg p-2">
                    <span>{opt.name}</span>
                    <span className="font-semibold">{parseFloat(opt.price).toFixed(2)}\u20AC</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Participant stats preview (if visibility allows and member) */}
      {!isManager && event.participant_stats && event.participant_visibility !== 'none' && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">group</span>
            Teilnehmende
          </h3>
          <p className="text-2xl font-bold text-violet-600">{event.participant_stats.total}</p>
          <p className="text-xs text-muted-foreground">angemeldet</p>
        </div>
      )}

      {/* Recent Timeline (manager only) */}
      {isManager && recentTimeline.length > 0 && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">timeline</span>
            Letzte Aktivitäten
          </h3>
          <div className="space-y-3">
            {recentTimeline.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-violet-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-foreground">{entry.description || entry.action_type_display}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString('de-DE')}
                    {entry.user_email && ` \u00B7 ${entry.user_email}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mini Registration Chart (manager only) */}
      {isManager && stats && stats.registration_timeline.length > 0 && (
        <MiniRegistrationChart points={stats.registration_timeline} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registration Status Card
// ---------------------------------------------------------------------------

function RegistrationStatusCard({
  event,
  onGoToRegistration,
}: {
  event: EventDetail;
  onGoToRegistration: () => void;
}) {
  const myReg = event.my_registration;
  const isRegistered = myReg && myReg.participants.length > 0;

  return (
    <div
      className={`rounded-xl border p-4 ${
        isRegistered
          ? 'border-green-200 bg-green-50/50'
          : 'border-amber-200 bg-amber-50/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isRegistered
                ? 'bg-green-100 text-green-600'
                : 'bg-amber-100 text-amber-600'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {isRegistered ? 'check_circle' : 'app_registration'}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold">
              {isRegistered ? 'Du bist angemeldet' : 'Noch nicht angemeldet'}
            </p>
            {isRegistered && myReg && (
              <p className="text-xs text-muted-foreground">
                {myReg.participants.length} Person{myReg.participants.length !== 1 ? 'en' : ''} angemeldet
                {myReg.participants[0]?.booking_option_name &&
                  ` \u2013 ${myReg.participants.map((p) => p.booking_option_name).filter(Boolean).join(', ')}`}
              </p>
            )}
            {!isRegistered && event.phase === 'registration' && (
              <p className="text-xs text-muted-foreground">
                Die Anmeldephase ist geöffnet
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onGoToRegistration}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
            isRegistered
              ? 'border hover:bg-muted'
              : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isRegistered ? 'edit' : 'arrow_forward'}
          </span>
          {isRegistered ? 'Anmeldung' : 'Jetzt anmelden'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini Registration Chart
// ---------------------------------------------------------------------------

function MiniRegistrationChart({
  points,
}: {
  points: { date: string; cumulative_count: number }[];
}) {
  const displayPoints = points.slice(-10);
  const maxCount = Math.max(...displayPoints.map((p) => p.cumulative_count), 1);

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">show_chart</span>
        Anmeldeverlauf
      </h3>
      <div className="flex items-end gap-1 h-20">
        {displayPoints.map((p) => {
          const heightPct = (p.cumulative_count / maxCount) * 100;
          return (
            <div
              key={p.date}
              className="flex-1 flex flex-col items-center gap-0.5"
              title={`${new Date(p.date).toLocaleDateString('de-DE')}: ${p.cumulative_count}`}
            >
              <div className="w-full flex flex-col justify-end h-16">
                <div
                  className="w-full bg-gradient-to-t from-violet-500 to-purple-400 rounded-t transition-all"
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground leading-none">
                {new Date(p.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-right">
        Aktuell: {displayPoints[displayPoints.length - 1]?.cumulative_count ?? 0} Anmeldungen
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  subtitle: string;
  color: 'violet' | 'emerald' | 'amber';
}) {
  const colorMap = {
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}
