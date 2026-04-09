/**
 * DaySlotCard — Individual time slot card within an event day plan.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { EventDaySlot } from '@/schemas/event';
import { useDeleteDaySlot, useUpdateDaySlot } from '@/api/eventDayPlan';
import ConfirmDialog from '@/components/ConfirmDialog';

interface DaySlotCardProps {
  slot: EventDaySlot;
  eventSlug: string;
  isManager: boolean;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  // "HH:MM:SS" → "HH:MM"
  return t.slice(0, 5);
}

export default function DaySlotCard({ slot, eventSlug, isManager }: DaySlotCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState(slot.title);
  const [editNotes, setEditNotes] = useState(slot.notes);
  const [editStartTime, setEditStartTime] = useState(formatTime(slot.start_time));
  const [editEndTime, setEditEndTime] = useState(formatTime(slot.end_time));

  const updateSlot = useUpdateDaySlot(eventSlug);
  const deleteSlot = useDeleteDaySlot(eventSlug);

  const timeDisplay =
    slot.start_time || slot.end_time
      ? `${formatTime(slot.start_time)}${slot.end_time ? ` – ${formatTime(slot.end_time)}` : ''}`
      : null;

  function handleSave() {
    updateSlot.mutate(
      {
        slotId: slot.id,
        title: editTitle,
        notes: editNotes,
        start_time: editStartTime || null,
        end_time: editEndTime || null,
      },
      {
        onSuccess: () => {
          toast.success('Eintrag aktualisiert');
          setIsEditing(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  function handleDelete() {
    deleteSlot.mutate(slot.id, {
      onSuccess: () => {
        toast.success('Eintrag geloescht');
        setShowDeleteConfirm(false);
      },
      onError: (err) => {
        toast.error('Fehler', { description: err.message });
        setShowDeleteConfirm(false);
      },
    });
  }

  if (isEditing) {
    return (
      <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Titel"
          className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
        />
        <div className="flex gap-2">
          <input
            type="time"
            value={editStartTime}
            onChange={(e) => setEditStartTime(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded-md bg-background"
          />
          <span className="text-sm text-muted-foreground self-center">–</span>
          <input
            type="time"
            value={editEndTime}
            onChange={(e) => setEditEndTime(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded-md bg-background"
          />
        </div>
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Notizen"
          rows={2}
          className="w-full px-2 py-1.5 text-sm border rounded-md bg-background resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 text-xs border rounded-md hover:bg-muted"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={updateSlot.isPending || !editTitle.trim()}
            className="px-3 py-1 text-xs bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            {updateSlot.isPending ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Eintrag loeschen?"
        description={`"${slot.title}" wird unwiderruflich geloescht.`}
        confirmLabel="Loeschen"
        loading={deleteSlot.isPending}
      />
      <div className="flex items-start gap-3 group">
        {/* Time column */}
        <div className="w-14 shrink-0 text-right">
          {timeDisplay ? (
            <span className="text-xs font-mono text-muted-foreground">{formatTime(slot.start_time)}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">–</span>
          )}
        </div>

        {/* Timeline dot */}
        <div className="relative flex flex-col items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500 ring-2 ring-violet-200 mt-1.5" />
          <div className="w-px flex-1 bg-violet-200/50" />
        </div>

        {/* Content */}
        <div className="flex-1 pb-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{slot.title}</p>
              {timeDisplay && (
                <p className="text-xs text-muted-foreground">{timeDisplay}</p>
              )}
              {slot.content_title && (
                <p className="text-xs text-violet-600 flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">link</span>
                  {slot.content_title}
                </p>
              )}
              {slot.notes && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{slot.notes}</p>
              )}
            </div>
            {isManager && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded hover:bg-muted"
                  title="Bearbeiten"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                  title="Loeschen"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
