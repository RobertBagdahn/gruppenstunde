/**
 * ProgramEditor — Enhanced day-by-day program editor with drag-and-drop reordering,
 * content linking, inline CRUD, and print-friendly view.
 * Uses @dnd-kit for drag-and-drop within each day group.
 */
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import type { EventDaySlot } from '@/schemas/event';
import type { EventDetail } from '@/schemas/event';
import {
  useEventDaySlots,
  useCreateDaySlot,
  useUpdateDaySlot,
  useDeleteDaySlot,
} from '@/api/eventDayPlan';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ConfirmDialog from '@/components/ConfirmDialog';
import { API_BASE_URL } from '@/lib/api';

interface Props {
  event: EventDetail;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByDate(slots: EventDaySlot[]): Map<string, EventDaySlot[]> {
  const map = new Map<string, EventDaySlot[]>();
  for (const slot of slots) {
    const existing = map.get(slot.date) ?? [];
    existing.push(slot);
    map.set(slot.date, existing);
  }
  return map;
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProgramEditor({ event }: Props) {
  const { data: daySlots, isLoading } = useEventDaySlots(event.slug);
  const updateSlot = useUpdateDaySlot(event.slug);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForDate, setAddForDate] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grouped = useMemo(() => groupByDate(daySlots ?? []), [daySlots]);
  const sortedDates = useMemo(() => [...grouped.keys()].sort(), [grouped]);

  const handleAddGeneral = () => {
    const defaultDate = event.start_date
      ? event.start_date.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    setAddForDate(defaultDate);
    setShowAddForm(true);
  };

  const handleAddForDate = (dateStr: string) => {
    setAddForDate(dateStr);
    setShowAddForm(true);
  };

  const handleDragEnd = useCallback(
    (dateStr: string, e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;

      const slots = grouped.get(dateStr);
      if (!slots) return;

      const oldIdx = slots.findIndex((s) => s.id === active.id);
      const newIdx = slots.findIndex((s) => s.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      // Update sort_order for the moved slot
      updateSlot.mutate(
        { slotId: Number(active.id), sort_order: newIdx },
        {
          onError: (err) => toast.error('Fehler beim Sortieren', { description: err.message }),
        },
      );
    },
    [grouped, updateSlot],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <span className="material-symbols-outlined text-xl animate-spin mr-2">progress_activity</span>
        Wird geladen...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">view_timeline</span>
          Programm
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">print</span>
            Drucken
          </button>
          <button
            onClick={handleAddGeneral}
            className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Eintrag hinzufügen
          </button>
        </div>
      </div>

      {/* Print header (only visible when printing) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">{event.name} — Programm</h1>
        {event.start_date && event.end_date && (
          <p className="text-sm text-muted-foreground">
            {new Date(event.start_date).toLocaleDateString('de-DE')} –{' '}
            {new Date(event.end_date).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>

      {/* Empty state */}
      {sortedDates.length === 0 && (
        <div className="text-center py-8 border border-dashed rounded-lg print:hidden">
          <span className="material-symbols-outlined text-3xl text-muted-foreground/30 mb-2">
            event_note
          </span>
          <p className="text-sm text-muted-foreground">
            Noch keine Einträge im Programm.
          </p>
          <button
            onClick={handleAddGeneral}
            className="mt-3 px-4 py-1.5 text-xs bg-violet-600 text-white rounded-md hover:bg-violet-700"
          >
            Ersten Eintrag erstellen
          </button>
        </div>
      )}

      {/* Day-by-day sections */}
      {sortedDates.map((dateStr) => {
        const slots = grouped.get(dateStr) ?? [];
        return (
          <DaySection
            key={dateStr}
            dateStr={dateStr}
            slots={slots}
            eventSlug={event.slug}
            sensors={sensors}
            onDragEnd={(e) => handleDragEnd(dateStr, e)}
            onAdd={() => handleAddForDate(dateStr)}
          />
        );
      })}

      {/* Add form */}
      {showAddForm && (
        <AddSlotForm
          eventSlug={event.slug}
          defaultDate={addForDate}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day Section with DnD
// ---------------------------------------------------------------------------

function DaySection({
  dateStr,
  slots,
  eventSlug,
  sensors,
  onDragEnd,
  onAdd,
}: {
  dateStr: string;
  slots: EventDaySlot[];
  eventSlug: string;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
  onAdd: () => void;
}) {
  const sortedSlotIds = useMemo(() => slots.map((s) => s.id), [slots]);

  return (
    <div className="print:break-inside-avoid">
      {/* Date heading */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {formatDateHeading(dateStr)}
        </h4>
        <button
          onClick={onAdd}
          className="p-1 rounded hover:bg-muted print:hidden"
          title="Eintrag hinzufügen"
        >
          <span className="material-symbols-outlined text-[16px] text-muted-foreground">
            add_circle
          </span>
        </button>
      </div>

      {/* Sortable slots */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sortedSlotIds} strategy={verticalListSortingStrategy}>
          <div>
            {slots.map((slot) => (
              <SortableSlotCard
                key={slot.id}
                slot={slot}
                eventSlug={eventSlug}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable Slot Card
// ---------------------------------------------------------------------------

function SortableSlotCard({
  slot,
  eventSlug,
}: {
  slot: EventDaySlot;
  eventSlug: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateSlot = useUpdateDaySlot(eventSlug);
  const deleteSlot = useDeleteDaySlot(eventSlug);

  // Edit form state
  const [editTitle, setEditTitle] = useState(slot.title);
  const [editNotes, setEditNotes] = useState(slot.notes);
  const [editStartTime, setEditStartTime] = useState(formatTime(slot.start_time));
  const [editEndTime, setEditEndTime] = useState(formatTime(slot.end_time));

  const timeDisplay =
    slot.start_time || slot.end_time
      ? `${formatTime(slot.start_time)}${slot.end_time ? ` – ${formatTime(slot.end_time)}` : ''}`
      : null;

  const handleSave = () => {
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
  };

  const handleDelete = () => {
    deleteSlot.mutate(slot.id, {
      onSuccess: () => {
        toast.success('Eintrag gelöscht');
        setShowDeleteConfirm(false);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  if (isEditing) {
    return (
      <div className="border rounded-lg p-3 space-y-2 bg-muted/30 mb-2 print:hidden">
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
        title="Eintrag löschen?"
        description={`"${slot.title}" wird unwiderruflich gelöscht.`}
        confirmLabel="Löschen"
        loading={deleteSlot.isPending}
      />
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-start gap-3 group"
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground print:hidden shrink-0"
          title="Ziehen zum Sortieren"
        >
          <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
        </button>

        {/* Time column */}
        <div className="w-12 shrink-0 text-right">
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
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 print:hidden">
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
                title="Löschen"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Slot Form (inline)
// ---------------------------------------------------------------------------

function AddSlotForm({
  eventSlug,
  defaultDate,
  onClose,
}: {
  eventSlug: string;
  defaultDate: string;
  onClose: () => void;
}) {
  const createSlot = useCreateDaySlot(eventSlug);
  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [contentType, setContentType] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [contentObjectId, setContentObjectId] = useState<number | null>(null);
  const [contentResults, setContentResults] = useState<{ id: number; title: string; slug: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Content linking search (25.3)
  const handleContentSearch = async (query: string) => {
    setContentSearch(query);
    if (!query.trim() || !contentType) {
      setContentResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search content by type
      const endpoint = contentType === 'groupsession'
        ? `${API_BASE_URL}/api/sessions/`
        : contentType === 'game'
        ? `${API_BASE_URL}/api/games/`
        : null;

      if (!endpoint) {
        setContentResults([]);
        setIsSearching(false);
        return;
      }

      const res = await fetch(`${endpoint}?search=${encodeURIComponent(query)}&page_size=5`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.items ?? data.results ?? data ?? [];
        setContentResults(
          items.slice(0, 5).map((item: Record<string, unknown>) => ({
            id: item.id as number,
            title: (item.title ?? item.name ?? '') as string,
            slug: (item.slug ?? '') as string,
          })),
        );
      }
    } catch {
      toast.error('Suche fehlgeschlagen');
    }
    setIsSearching(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createSlot.mutate(
      {
        date,
        title: title.trim(),
        start_time: startTime || null,
        end_time: endTime || null,
        notes: notes.trim(),
        content_type: contentType || null,
        object_id: contentObjectId,
      },
      {
        onSuccess: () => {
          toast.success('Eintrag erstellt');
          setTitle('');
          setStartTime('');
          setEndTime('');
          setNotes('');
          setContentType('');
          setContentObjectId(null);
          setContentSearch('');
          onClose();
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-violet-600 text-[18px]">add_circle</span>
        <h3 className="text-sm font-semibold">Neuer Programmpunkt</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Datum *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Frühstück, Wanderung, Lagerfeuer"
              required
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Von</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Bis</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Inhalt verknüpfen (optional)
            </label>
            <select
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value);
                setContentObjectId(null);
                setContentSearch('');
                setContentResults([]);
              }}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="">Kein Inhalt</option>
              <option value="groupsession">Gruppenstunde</option>
              <option value="game">Spiel</option>
            </select>
          </div>
        </div>

        {/* Content search (25.3) */}
        {contentType && (
          <div className="relative">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {contentType === 'groupsession' ? 'Gruppenstunde' : 'Spiel'} suchen
            </label>
            <input
              type="text"
              value={contentSearch}
              onChange={(e) => handleContentSearch(e.target.value)}
              placeholder="Titel eingeben..."
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
            {isSearching && (
              <span className="absolute right-3 top-8 text-xs text-muted-foreground">
                Suche...
              </span>
            )}
            {contentResults.length > 0 && (
              <div className="mt-1 border rounded-md bg-background shadow-sm max-h-40 overflow-y-auto">
                {contentResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setContentObjectId(item.id);
                      setContentSearch(item.title);
                      setContentResults([]);
                      if (!title) setTitle(item.title);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                      contentObjectId === item.id ? 'bg-violet-50 text-violet-700' : ''
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
            {contentObjectId && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                Verknüpft
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Notizen</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionale Notizen..."
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={createSlot.isPending || !title.trim()}
            className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            {createSlot.isPending ? 'Erstellen...' : 'Erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}
