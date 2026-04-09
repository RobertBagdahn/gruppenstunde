/**
 * AddDaySlotDialog — Dialog for adding a new day slot to an event's day plan.
 * Uses native <dialog> element for modal behavior.
 */
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useCreateDaySlot } from '@/api/eventDayPlan';

interface AddDaySlotDialogProps {
  open: boolean;
  eventSlug: string;
  defaultDate: string; // "YYYY-MM-DD"
  onClose: () => void;
}

export default function AddDaySlotDialog({
  open,
  eventSlug,
  defaultDate,
  onClose,
}: AddDaySlotDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createSlot = useCreateDaySlot(eventSlug);

  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (dialog && e.target === dialog) {
      onClose();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    createSlot.mutate(
      {
        date,
        title: title.trim(),
        start_time: startTime || null,
        end_time: endTime || null,
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Eintrag erstellt');
          // Reset form
          setTitle('');
          setStartTime('');
          setEndTime('');
          setNotes('');
          onClose();
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="p-0 rounded-xl shadow-xl backdrop:bg-black/50 max-w-md w-full"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-violet-600">add_circle</span>
          <h2 className="text-base font-semibold">Neuer Tagesplan-Eintrag</h2>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Datum
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Titel *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Fruehstueck, Wanderung, Lagerfeuer"
            required
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Time range */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Von
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Bis
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Notizen
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionale Notizen..."
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={createSlot.isPending || !title.trim()}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            {createSlot.isPending ? 'Erstellen...' : 'Erstellen'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
