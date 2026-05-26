/**
 * AttendanceView — Check-in / check-out view for event participants.
 * Includes toggle switches per participant, batch check-in, and summary.
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { EventDetail, Participant } from '@/schemas/event';
import {
  useAttendanceList,
  useCheckIn,
  useBatchCheckIn,
  useCheckOut,
} from '@/api/eventDashboard';

interface Props {
  event: EventDetail;
}

export default function AttendanceView({ event }: Props) {
  const { data: attendanceData, isLoading } = useAttendanceList(event.slug, 1, 200);
  const checkIn = useCheckIn(event.slug);
  const batchCheckIn = useBatchCheckIn(event.slug);
  const checkOut = useCheckOut(event.slug);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  // All participants from registrations
  const allParticipants: Participant[] =
    event.all_registrations?.flatMap((r) => r.participants) ?? [];

  // Build attendance map: participantId -> AttendanceRecord
  const attendanceMap = useMemo(() => {
    const map = new Map<number, { is_checked_in: boolean; checked_in_at?: string | null; checked_out_at?: string | null }>();
    if (attendanceData?.items) {
      for (const rec of attendanceData.items) {
        map.set(rec.participant_id, {
          is_checked_in: rec.is_checked_in,
          checked_in_at: rec.checked_in_at,
          checked_out_at: rec.checked_out_at,
        });
      }
    }
    return map;
  }, [attendanceData]);

  // Filter participants by search
  const filtered = useMemo(() => {
    if (!search) return allParticipants;
    const s = search.toLowerCase();
    return allParticipants.filter(
      (p) =>
        p.first_name.toLowerCase().includes(s) ||
        p.last_name.toLowerCase().includes(s) ||
        p.scout_name.toLowerCase().includes(s),
    );
  }, [allParticipants, search]);

  // Summary
  const checkedInCount = allParticipants.filter((p) => attendanceMap.get(p.id)?.is_checked_in).length;
  const totalCount = allParticipants.length;

  const handleToggle = (participantId: number) => {
    const record = attendanceMap.get(participantId);
    if (record?.is_checked_in) {
      checkOut.mutate(participantId, {
        onError: (err) => toast.error('Fehler', { description: err.message }),
      });
    } else {
      checkIn.mutate(
        { participant_id: participantId },
        {
          onError: (err) => toast.error('Fehler', { description: err.message }),
        },
      );
    }
  };

  const toggleSelected = (participantId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  const selectAllUnchecked = () => {
    const unchecked = filtered
      .filter((p) => !attendanceMap.get(p.id)?.is_checked_in)
      .map((p) => p.id);
    setSelectedIds(new Set(unchecked));
  };

  const handleBatchCheckIn = () => {
    if (selectedIds.size === 0) return;
    batchCheckIn.mutate(
      { participant_ids: Array.from(selectedIds) },
      {
        onSuccess: () => {
          toast.success(`${selectedIds.size} Teilnehmer eingecheckt`);
          setSelectedIds(new Set());
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <span className="material-symbols-outlined text-2xl animate-spin mr-2">
          progress_activity
        </span>
        Anwesenheit wird geladen...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">fact_check</span>
          </div>
          <div>
            <p className="text-sm font-semibold">
              {checkedInCount} von {totalCount} eingecheckt
            </p>
            <div className="w-32 h-2 bg-muted rounded-full mt-1">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: totalCount > 0 ? `${(checkedInCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
        {totalCount > 0 && (
          <span className="text-lg font-bold text-emerald-600">
            {totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}%
          </span>
        )}
      </div>

      {/* Search + Batch Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined text-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name suchen..."
            className="w-full text-sm border rounded-lg pl-9 pr-3 py-2 bg-background"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAllUnchecked}
            className="px-3 py-2 text-xs font-medium border rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">select_all</span>
            Alle nicht-eingecheckten
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchCheckIn}
              disabled={batchCheckIn.isPending}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              {batchCheckIn.isPending
                ? 'Einchecken...'
                : `${selectedIds.size} einchecken`}
            </button>
          )}
        </div>
      </div>

      {/* Participant List with Toggles */}
      <div className="space-y-1">
        {filtered.map((p) => {
          const record = attendanceMap.get(p.id);
          const isCheckedIn = record?.is_checked_in ?? false;
          const isSelected = selectedIds.has(p.id);

          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 border rounded-xl p-3 transition-colors ${
                isCheckedIn ? 'bg-emerald-50/50 border-emerald-200' : ''
              } ${isSelected ? 'ring-2 ring-violet-300' : ''}`}
            >
              {/* Selection checkbox (for batch) */}
              {!isCheckedIn && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelected(p.id)}
                  className="rounded accent-violet-600 shrink-0"
                />
              )}
              {isCheckedIn && <div className="w-4" />}

              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  isCheckedIn
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-violet-100 text-violet-700'
                }`}
              >
                {p.first_name?.[0]}{p.last_name?.[0]}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {p.first_name} {p.last_name}
                  {p.scout_name && (
                    <span className="text-muted-foreground ml-1">({p.scout_name})</span>
                  )}
                </p>
                {isCheckedIn && record?.checked_in_at && (
                  <p className="text-xs text-muted-foreground">
                    Eingecheckt{' '}
                    {new Date(record.checked_in_at).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(p.id)}
                disabled={checkIn.isPending || checkOut.isPending}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
                  isCheckedIn
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700'
                    : 'border hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isCheckedIn ? 'logout' : 'login'}
                </span>
                {isCheckedIn ? 'Auschecken' : 'Einchecken'}
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block">person_off</span>
          {allParticipants.length === 0
            ? 'Keine Teilnehmer angemeldet'
            : 'Keine Teilnehmer gefunden'}
        </div>
      )}
    </div>
  );
}
