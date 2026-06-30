/**
 * RoomAssignmentView — Drag-and-drop room/tent assignment for event participants.
 * Includes CRUD for rooms, assign/unassign participants, capacity indicators.
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { EventDetail, Participant, RoomAssignment } from '@/schemas/event';
import {
  useRooms,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
  useAssignParticipant,
  useUnassignParticipant,
} from '@/api/eventDashboard';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Props {
  event: EventDetail;
}

export default function RoomAssignmentView({ event }: Props) {
  const { data: rooms, isLoading } = useRooms(event.slug);
  const deleteRoom = useDeleteRoom(event.slug);
  const assignParticipant = useAssignParticipant(event.slug);
  const unassignParticipant = useUnassignParticipant(event.slug);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomAssignment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [assigningRoomId, setAssigningRoomId] = useState<number | null>(null);

  // All participants
  const allParticipants: Participant[] =
    event.all_registrations?.flatMap((r) => r.participants) ?? [];

  // Assigned participant IDs (across all rooms)
  const assignedIds = useMemo(() => {
    const ids = new Set<number>();
    rooms?.forEach((room) => room.participants.forEach((p) => ids.add(p.id)));
    return ids;
  }, [rooms]);

  // Unassigned participants
  const unassigned = allParticipants.filter((p) => !assignedIds.has(p.id));

  const handleAssign = (roomId: number, participantId: number) => {
    assignParticipant.mutate(
      { roomId, participant_id: participantId },
      {
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleUnassign = (roomId: number, participantId: number) => {
    unassignParticipant.mutate(
      { roomId, participant_id: participantId },
      {
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleDeleteRoom = (roomId: number) => {
    deleteRoom.mutate(roomId, {
      onSuccess: () => {
        toast.success('Raum gelöscht');
        setConfirmDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <span className="material-symbols-outlined text-2xl animate-spin mr-2">
          progress_activity
        </span>
        Wird geladen...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">hotel</span>
          Zimmer- / Zelteinteilung
        </h3>
        <button
          onClick={() => { setShowCreateForm(true); setEditingRoom(null); }}
          className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Neuer Raum
        </button>
      </div>

      {/* Create / Edit Form */}
      {(showCreateForm || editingRoom) && (
        <RoomForm
          room={editingRoom}
          slug={event.slug}
          onClose={() => { setShowCreateForm(false); setEditingRoom(null); }}
        />
      )}

      {/* Room Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(rooms ?? []).map((room) => (
          <div key={room.id} className="border rounded-xl p-4 space-y-3">
            {/* Room Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{room.name}</p>
                {room.description && (
                  <p className="text-xs text-muted-foreground">{room.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditingRoom(room); setShowCreateForm(false); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Bearbeiten"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button
                  onClick={() => setConfirmDeleteId(room.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Löschen"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>

            {/* Capacity Indicator */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${
                    room.is_full ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: room.capacity > 0
                      ? `${Math.min(100, (room.current_occupancy / room.capacity) * 100)}%`
                      : room.current_occupancy > 0 ? '50%' : '0%',
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {room.current_occupancy}{room.capacity > 0 ? `/${room.capacity}` : ''}
              </span>
            </div>

            {/* Participants in Room */}
            <div className="space-y-1">
              {room.participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-semibold">
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <span>
                      {p.first_name} {p.last_name}
                      {p.scout_name && (
                        <span className="text-muted-foreground ml-1 text-xs">({p.scout_name})</span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnassign(room.id, p.id)}
                    className="text-muted-foreground hover:text-destructive text-xs"
                    title="Entfernen"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Assign Button */}
            {!room.is_full && (
              <button
                onClick={() => setAssigningRoomId(assigningRoomId === room.id ? null : room.id)}
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                Teilnehmer zuweisen
              </button>
            )}

            {/* Participant Picker */}
            {assigningRoomId === room.id && (
              <div className="border rounded-lg p-2 bg-muted/30 max-h-40 overflow-y-auto space-y-1">
                {unassigned.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Alle Teilnehmer sind eingeteilt
                  </p>
                ) : (
                  unassigned.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAssign(room.id, p.id)}
                      className="w-full flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      {p.first_name} {p.last_name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unassigned Participants */}
      {unassigned.length > 0 && (
        <div className="border border-dashed rounded-xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">person_off</span>
            Nicht eingeteilt ({unassigned.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-full"
              >
                {p.first_name} {p.last_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(rooms ?? []).length === 0 && !showCreateForm && (
        <div className="text-center py-8 text-muted-foreground">
          <span className="material-symbols-outlined text-3xl mb-2 block">hotel</span>
          <p className="text-sm">Noch keine Zimmer/Zelte angelegt</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-2 text-sm text-violet-600 hover:underline"
          >
            Jetzt erstellen
          </button>
        </div>
      )}

      {/* Print Button */}
      {(rooms ?? []).length > 0 && (
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors print:hidden"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          Zimmerliste drucken
        </button>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={() => confirmDeleteId && handleDeleteRoom(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        title="Raum löschen?"
        description="Alle Teilnehmer in diesem Raum werden als nicht eingeteilt markiert."
        confirmLabel="Löschen"
        loading={deleteRoom.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Room Create / Edit Form
// ---------------------------------------------------------------------------

function RoomForm({
  room,
  slug,
  onClose,
}: {
  room: RoomAssignment | null;
  slug: string;
  onClose: () => void;
}) {
  const createRoom = useCreateRoom(slug);
  const updateRoom = useUpdateRoom(slug);
  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(room?.capacity ?? 0);
  const [description, setDescription] = useState(room?.description ?? '');

  const isEdit = !!room;
  const isPending = createRoom.isPending || updateRoom.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEdit && room) {
      updateRoom.mutate(
        { roomId: room.id, name, capacity, description },
        {
          onSuccess: () => { toast.success('Raum aktualisiert'); onClose(); },
          onError: (err) => toast.error('Fehler', { description: err.message }),
        },
      );
    } else {
      createRoom.mutate(
        { name, capacity, description },
        {
          onSuccess: () => { toast.success('Raum erstellt'); onClose(); },
          onError: (err) => toast.error('Fehler', { description: err.message }),
        },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="z.B. Zelt A"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Kapazität</label>
          <input
            type="number"
            min="0"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="0 = unbegrenzt"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Beschreibung</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="optional"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50"
        >
          {isEdit ? 'Speichern' : 'Erstellen'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
