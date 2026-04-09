import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  usePlanners,
  usePlanner,
  useCreatePlanner,
  useDeletePlanner,
  useAddPlannerEntry,
  useUpdatePlannerEntry,
  useRemovePlannerEntry,
  useInviteCollaborator,
  useSearchUsers,
  type UserSearchResult,
} from '@/api/planner';
import { useUnifiedAutocomplete, type AutocompleteResult } from '@/api/search';
import { WEEKDAY_LABELS, type PlannerEntry } from '@/schemas/planner';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekDates(referenceDate: Date, count: number, weekday: number): string[] {
  // Generate `count` weekly dates starting from the first occurrence of `weekday`
  // at or after referenceDate
  const result: string[] = [];
  const d = new Date(referenceDate);
  // Advance to next weekday occurrence
  const dayOfWeek = d.getDay(); // 0=Sun
  // Convert spec weekday (0=Mon) to JS (0=Sun): spec + 1, 7 → 0
  const jsWeekday = (weekday + 1) % 7;
  let diff = jsWeekday - dayOfWeek;
  if (diff < 0) diff += 7;
  d.setDate(d.getDate() + diff);

  for (let i = 0; i < count; i++) {
    const iso = d.toISOString().slice(0, 10);
    result.push(iso);
    d.setDate(d.getDate() + 7);
  }
  return result;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatTime(t: string): string {
  // "18:00:00" → "18:00"
  return t.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Planner List + Create
// ---------------------------------------------------------------------------

export default function PlannerPage() {
  const { data: planners, isLoading } = usePlanners();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const deletePlanner = useDeletePlanner();

  // Auto-select first planner
  useEffect(() => {
    if (!selectedId && planners && planners.length > 0) {
      setSelectedId(planners[0].id);
    }
  }, [planners, selectedId]);

  return (
    <div>
      <ConfirmDialog
        open={deleteTargetId !== null}
        onConfirm={() => {
          if (deleteTargetId === null) return;
          deletePlanner.mutate(deleteTargetId, {
            onSuccess: () => {
              toast.success('Planer geloescht');
              if (selectedId === deleteTargetId) setSelectedId(null);
              setDeleteTargetId(null);
            },
            onError: (err) => {
              toast.error('Fehler beim Loeschen', { description: err.message });
              setDeleteTargetId(null);
            },
          });
        }}
        onCancel={() => setDeleteTargetId(null)}
        title="Planer loeschen?"
        description="Der Planer und alle Eintraege werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deletePlanner.isPending}
      />
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 md:shrink-0 space-y-3">
          {/* Tool-colored header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
              <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">Gruppenstundenplan</h1>
            </div>
          </div>

          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-md text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Neuer Planer
          </button>

          {showCreate && (
            <CreatePlannerForm
              onCreated={(id) => {
                setSelectedId(id);
                setShowCreate(false);
              }}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {isLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-14 bg-muted rounded-lg" />
              ))}
            </div>
          )}

          {planners?.map((pl) => (
            <div
              key={pl.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition ${
                selectedId === pl.id
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                  : 'hover:bg-muted border'
              }`}
              onClick={() => setSelectedId(pl.id)}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{pl.title}</div>
                <div className={`text-xs ${selectedId === pl.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {WEEKDAY_LABELS[pl.weekday]}s, {formatTime(pl.time)} Uhr
                  {pl.group_name ? ` · ${pl.group_name}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTargetId(pl.id);
                }}
                className={`shrink-0 ml-2 rounded p-1 transition ${
                  selectedId === pl.id
                    ? 'text-white/60 hover:text-white'
                    : 'text-destructive/50 hover:text-destructive'
                }`}
                title="Loeschen"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          ))}

          {planners && planners.length === 0 && !showCreate && (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-3xl text-muted-foreground mb-2 block">
                calendar_month
              </span>
              <p className="text-sm text-muted-foreground">
                Erstelle deinen ersten Planer.
              </p>
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0">
          {selectedId ? (
            <PlannerDetail plannerId={selectedId} />
          ) : (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2 block">
                event_note
              </span>
              <p className="text-muted-foreground text-sm">
                Waehle einen Planer aus oder erstelle einen neuen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Planner Form
// ---------------------------------------------------------------------------

function CreatePlannerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: number) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [weekday, setWeekday] = useState(4);
  const [time, setTime] = useState('18:00');
  const createPlanner = useCreatePlanner();

  const handleSubmit = () => {
    if (title.trim()) {
      createPlanner.mutate(
        { title: title.trim(), weekday, time },
        { onSuccess: (data) => onCreated(data.id) },
      );
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-card space-y-2">
      <input
        type="text"
        placeholder="Titel..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="w-full px-3 py-2 rounded-md border text-sm bg-background"
        autoFocus
      />
      <div className="flex gap-2">
        <select
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value))}
          className="flex-1 px-2 py-1.5 rounded-md border text-sm bg-background"
        >
          {Object.entries(WEEKDAY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-2 py-1.5 rounded-md border text-sm bg-background"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || createPlanner.isPending}
          className="flex-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-md text-sm disabled:opacity-50"
        >
          Erstellen
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border rounded-md text-sm hover:bg-muted"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planner Detail – Calendar View
// ---------------------------------------------------------------------------

function PlannerDetail({ plannerId }: { plannerId: number }) {
  const { data, isLoading, error, refetch } = usePlanner(plannerId);
  const addEntry = useAddPlannerEntry(plannerId);
  const updateEntry = useUpdatePlannerEntry(plannerId);
  const removeEntry = useRemovePlannerEntry(plannerId);
  const navigate = useNavigate();

  // Number of weeks to show
  const [weekCount, setWeekCount] = useState(12);

  // Generate slot dates
  const slots = useMemo(() => {
    if (!data) return [];
    const today = new Date();
    // Start 2 weeks in the past
    const start = new Date(today);
    start.setDate(start.getDate() - 14);
    return getWeekDates(start, weekCount, data.weekday);
  }, [data, weekCount]);

  // Build map of date -> entry
  const entryMap = useMemo(() => {
    const map = new Map<string, PlannerEntry>();
    data?.entries.forEach((e) => map.set(e.date, e));
    return map;
  }, [data?.entries]);

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  if (error || !data) return <ErrorDisplay error={error} title="Planer nicht gefunden" onRetry={() => refetch()} />;

  const canEdit = data.can_edit;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold">{data.title}</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              {WEEKDAY_LABELS[data.weekday]}s, {formatTime(data.time)} Uhr
            </span>
            {data.group_name && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">group</span>
                {data.group_name}
              </span>
            )}
            {!canEdit && (
              <span className="flex items-center gap-1 text-amber-600">
                <span className="material-symbols-outlined text-sm">visibility</span>
                Nur Ansicht
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Slots */}
      <div className="space-y-2">
        {slots.map((dateStr) => {
          const entry = entryMap.get(dateStr);
          const isPast = new Date(dateStr) < new Date(new Date().toISOString().slice(0, 10));
          const isCancelled = entry?.status === 'cancelled';

          return (
            <CalendarSlot
              key={dateStr}
              date={dateStr}
              entry={entry ?? null}
              isPast={isPast}
              isCancelled={isCancelled}
              canEdit={canEdit}
              onAddEntry={(ideaId, notes) =>
                addEntry.mutate({ date: dateStr, session_id: ideaId, notes })
              }
              onUpdateEntry={(entryId, updates) =>
                updateEntry.mutate({ entryId, ...updates })
              }
              onRemoveEntry={(entryId) => removeEntry.mutate(entryId)}
              onIdeaClick={(slug) => navigate(`/sessions/${slug}`)}
            />
          );
        })}
      </div>

      {/* Load More */}
      <button
        onClick={() => setWeekCount((c) => c + 12)}
        className="mt-4 w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-lg transition"
      >
        Mehr Wochen laden
      </button>

      {/* Collaborators */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-2">Mitarbeiter</h3>
        {data.collaborators.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.collaborators.map((c) => (
              <span key={c.id} className="rounded-full bg-muted px-3 py-1 text-xs">
                {c.username} ({c.role === 'editor' ? 'Editor' : 'Betrachter'})
              </span>
            ))}
          </div>
        )}
        {canEdit && (
          <InviteSection
            plannerId={plannerId}
            existingCollaborators={data.collaborators}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar Slot (single week entry)
// ---------------------------------------------------------------------------

function CalendarSlot({
  date,
  entry,
  isPast,
  isCancelled,
  canEdit,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onIdeaClick,
}: {
  date: string;
  entry: PlannerEntry | null;
  isPast: boolean;
  isCancelled: boolean;
  canEdit: boolean;
  onAddEntry: (ideaId?: number, notes?: string) => void;
  onUpdateEntry: (entryId: number, updates: Record<string, unknown>) => void;
  onRemoveEntry: (entryId: number) => void;
  onIdeaClick: (slug: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;

  return (
    <div
      className={`border rounded-lg p-3 transition ${
        isToday ? 'border-emerald-500 bg-emerald-50' : ''
      } ${isPast ? 'opacity-60' : ''} ${
        isCancelled ? 'bg-muted/50' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Date */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-medium ${isToday ? 'text-emerald-600' : ''}`}>
            {formatDate(date)}
          </span>
          {isToday && (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500 text-white rounded-full font-medium">
              Heute
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {entry ? (
            <div className={isCancelled ? 'line-through text-muted-foreground' : ''}>
              {entry.session_title ? (
                <button
                  type="button"
                  onClick={() => entry.session_slug && onIdeaClick(entry.session_slug)}
                  className="text-sm text-primary hover:underline font-medium truncate block text-left"
                >
                  {entry.session_title}
                </button>
              ) : entry.notes ? (
                <span className="text-sm text-muted-foreground">{entry.notes}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">Kein Inhalt</span>
              )}
            </div>
          ) : canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-muted-foreground/50 hover:text-muted-foreground italic transition"
            >
              Termin belegen...
            </button>
          ) : (
            <span className="text-sm text-muted-foreground/40 italic">Frei</span>
          )}
        </div>

        {/* Actions */}
        {canEdit && entry && (
          <div className="flex items-center gap-1 shrink-0">
            {isCancelled ? (
              <button
                type="button"
                onClick={() => onUpdateEntry(entry.id, { status: 'planned' })}
                className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                title="Wieder aktivieren"
              >
                Aktivieren
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onUpdateEntry(entry.id, { status: 'cancelled' })}
                className="text-muted-foreground/50 hover:text-amber-600 transition"
                title="Faellt aus"
              >
                <span className="material-symbols-outlined text-sm">event_busy</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemoveEntry(entry.id)}
              className="text-muted-foreground/50 hover:text-destructive transition"
              title="Entfernen"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Inline add form */}
      {editing && !entry && canEdit && (
        <AddEntryInline
          onAdd={(ideaId, notes) => {
            onAddEntry(ideaId, notes);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Notes below title */}
      {entry && entry.notes && entry.session_title && !isCancelled && (
        <p className="text-xs text-muted-foreground mt-1 pl-0">{entry.notes}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Add Entry
// ---------------------------------------------------------------------------

function AddEntryInline({
  onAdd,
  onCancel,
}: {
  onAdd: (ideaId?: number, notes?: string) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [ideaQuery, setIdeaQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<AutocompleteResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useUnifiedAutocomplete(ideaQuery);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mt-2 flex flex-col sm:flex-row gap-2">
      <div ref={wrapperRef} className="relative flex-1">
        <input
          type="text"
          placeholder="Gruppenstunde suchen..."
          value={selectedIdea ? selectedIdea.title : ideaQuery}
          onChange={(e) => {
            setIdeaQuery(e.target.value);
            setSelectedIdea(null);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full px-2 py-1.5 rounded border text-sm bg-background"
          autoFocus
        />
        {selectedIdea && (
          <button
            type="button"
            onClick={() => {
              setSelectedIdea(null);
              setIdeaQuery('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
        {showSuggestions && suggestions && suggestions.length > 0 && !selectedIdea && (
          <ul className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIdea(item);
                    setIdeaQuery('');
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                >
                  <span className="font-medium">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        type="text"
        placeholder="Notizen..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="px-2 py-1.5 rounded border text-sm bg-background flex-1"
      />
      <div className="flex gap-1">
        <button
          onClick={() => onAdd(selectedIdea?.id, notes || undefined)}
          className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded text-sm"
        >
          OK
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border rounded text-sm hover:bg-muted"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite Section
// ---------------------------------------------------------------------------

function InviteSection({
  plannerId,
  existingCollaborators,
}: {
  plannerId: number;
  existingCollaborators: { user_id: number }[];
}) {
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [role, setRole] = useState<string>('viewer');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: users } = useSearchUsers(query);
  const invite = useInviteCollaborator(plannerId);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const existingIds = new Set(existingCollaborators.map((c) => c.user_id));
  const filteredUsers = users?.filter((u) => !existingIds.has(u.id));

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
      <div ref={wrapperRef} className="relative flex-1">
        <input
          type="text"
          placeholder="Person einladen..."
          value={selectedUser ? selectedUser.scout_display_name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedUser(null);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full px-3 py-2 rounded-md border text-sm bg-background"
        />
        {selectedUser && (
          <button
            type="button"
            onClick={() => {
              setSelectedUser(null);
              setQuery('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
        {showSuggestions && filteredUsers && filteredUsers.length > 0 && !selectedUser && (
          <ul className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredUsers.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(user);
                    setQuery('');
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                >
                  <span className="font-medium">{user.scout_display_name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{user.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="px-3 py-2 rounded-md border text-sm bg-background"
      >
        <option value="viewer">Betrachter</option>
        <option value="editor">Editor</option>
      </select>
      <button
        onClick={() => {
          if (selectedUser) {
            invite.mutate(
              { user_id: selectedUser.id, role },
              {
                onSuccess: () => toast.success('Einladung gesendet'),
                onError: (err) => toast.error('Fehler', { description: err.message }),
              },
            );
            setSelectedUser(null);
            setQuery('');
          }
        }}
        disabled={!selectedUser || invite.isPending}
        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-md text-sm disabled:opacity-50"
      >
        Einladen
      </button>
    </div>
  );
}
