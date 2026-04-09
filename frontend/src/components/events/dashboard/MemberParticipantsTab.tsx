/**
 * MemberParticipantsTab — Shows participant stats based on the event's
 * `participant_visibility` setting.
 *
 * - none: "Die Teilnehmerliste ist nicht freigegeben."
 * - total_only: Total count
 * - per_option: Count per booking option
 * - with_names: First names grouped by booking option
 *
 * Managers always see full data.
 */
import type { EventDetail } from '@/schemas/event';

interface Props {
  event: EventDetail;
  isManager: boolean;
}

export default function MemberParticipantsTab({ event, isManager }: Props) {
  const visibility = event.participant_visibility;
  const stats = event.participant_stats;

  // Managers always see full stats
  if (isManager && stats) {
    return <FullParticipantStats event={event} />;
  }

  // Member views based on visibility setting
  if (visibility === 'none') {
    return (
      <div className="rounded-xl border p-6 text-center">
        <span className="material-symbols-outlined text-[40px] text-muted-foreground mb-2">
          visibility_off
        </span>
        <p className="text-sm text-muted-foreground">
          Die Teilnehmerliste ist nicht freigegeben.
        </p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Keine Teilnehmer-Daten verfügbar.
        </p>
      </div>
    );
  }

  if (visibility === 'total_only') {
    return (
      <div className="rounded-xl border p-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">group</span>
          Teilnehmende
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <div>
            <p className="text-sm font-medium">Angemeldete Teilnehmer</p>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </div>
        </div>
      </div>
    );
  }

  // per_option or with_names
  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">group</span>
        Teilnehmende ({stats.total} gesamt)
      </h3>

      <div className="space-y-3">
        {stats.by_option.map((opt) => (
          <div key={opt.option_id} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{opt.option_name}</span>
              <span className="text-sm text-muted-foreground">
                {opt.count}
                {opt.max_participants > 0 && ` / ${opt.max_participants}`}
              </span>
            </div>

            {/* Fill bar */}
            {opt.max_participants > 0 && (
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min((opt.count / opt.max_participants) * 100, 100)}%`,
                  }}
                />
              </div>
            )}

            {/* Names (only for with_names) */}
            {visibility === 'with_names' && opt.participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {opt.participants.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full stats for managers
// ---------------------------------------------------------------------------

function FullParticipantStats({ event }: { event: EventDetail }) {
  const stats = event.participant_stats;
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">group</span>
          Teilnehmende ({stats.total} gesamt)
        </h3>

        <div className="space-y-3">
          {stats.by_option.map((opt) => (
            <div key={opt.option_id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{opt.option_name}</span>
                <span className="text-sm text-muted-foreground">
                  {opt.count}
                  {opt.max_participants > 0 && ` / ${opt.max_participants}`}
                </span>
              </div>

              {opt.max_participants > 0 && (
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min((opt.count / opt.max_participants) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}

              {opt.participants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {opt.participants.map((name, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Visibility info for manager */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 flex items-start gap-2">
        <span className="material-symbols-outlined text-blue-600 text-[16px] mt-0.5">info</span>
        <p className="text-xs text-blue-700">
          Sichtbarkeit für Teilnehmer: <strong>{
            {
              none: 'Nicht sichtbar',
              total_only: 'Nur Gesamtzahl',
              per_option: 'Zahlen pro Buchungsoption',
              with_names: 'Zahlen und Vornamen',
            }[event.participant_visibility] || 'Nicht sichtbar'
          }</strong>. Änderbar in den Einstellungen.
        </p>
      </div>
    </div>
  );
}
