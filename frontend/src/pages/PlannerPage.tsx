import { useState, useRef, useEffect } from 'react';
import {
  usePlanners,
  usePlanner,
  useCreatePlanner,
  useAddPlannerEntry,
  useRemovePlannerEntry,
  useInviteCollaborator,
  useSearchUsers,
  type UserSearchResult,
} from '@/api/planner';
import { useAutocomplete } from '@/api/ideas';
import type { Autocomplete } from '@/schemas/idea';

export default function PlannerPage() {
  const { data: planners, isLoading } = usePlanners();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const createPlanner = useCreatePlanner();

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 md:shrink-0 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Neuer Kalender..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border text-sm bg-background"
            />
            <button
              onClick={() => {
                if (newTitle.trim()) {
                  createPlanner.mutate({ title: newTitle.trim() });
                  setNewTitle('');
                }
              }}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              +
            </button>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Laden...</p>}
          {planners?.map((cal) => (
            <button
              key={cal.id}
              onClick={() => setSelectedId(cal.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                selectedId === cal.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {cal.title}
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="flex-1">
          {selectedId ? (
            <PlannerDetail plannerId={selectedId} />
          ) : (
            <p className="text-muted-foreground">Wähle einen Planer aus oder erstelle einen neuen.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PlannerDetail({ plannerId }: { plannerId: number }) {
  const { data, isLoading } = usePlanner(plannerId);
  const addEntry = useAddPlannerEntry(plannerId);
  const removeEntry = useRemovePlannerEntry(plannerId);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [ideaQuery, setIdeaQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<Autocomplete | null>(null);
  const [showIdeaSuggestions, setShowIdeaSuggestions] = useState(false);
  const { data: ideaSuggestions } = useAutocomplete(ideaQuery);
  const ideaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ideaRef.current && !ideaRef.current.contains(e.target as Node)) {
        setShowIdeaSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded" />;
  if (!data) return <p className="text-destructive">Planer nicht gefunden.</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{data.title}</h2>

      {/* Add Entry */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-md border text-sm bg-background"
          />
          <input
            type="text"
            placeholder="Notizen..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div ref={ideaRef} className="relative flex-1">
            <input
              type="text"
              placeholder="Idee suchen (optional)..."
              value={selectedIdea ? selectedIdea.title : ideaQuery}
              onChange={(e) => {
                setIdeaQuery(e.target.value);
                setSelectedIdea(null);
                setShowIdeaSuggestions(true);
              }}
              onFocus={() => setShowIdeaSuggestions(true)}
              className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            />
            {selectedIdea && (
              <button
                type="button"
                onClick={() => {
                  setSelectedIdea(null);
                  setIdeaQuery('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            )}
            {showIdeaSuggestions && ideaSuggestions && ideaSuggestions.length > 0 && !selectedIdea && (
              <ul className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {ideaSuggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIdea(item);
                        setIdeaQuery('');
                        setShowIdeaSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    >
                      <span className="font-medium">{item.title}</span>
                      {item.summary && (
                        <span className="text-muted-foreground ml-2 text-xs">{item.summary}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => {
              if (date) {
                addEntry.mutate({
                  date,
                  notes,
                  ...(selectedIdea ? { idea_id: selectedIdea.id } : {}),
                });
                setDate('');
                setNotes('');
                setSelectedIdea(null);
                setIdeaQuery('');
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Entries */}
      {data.entries.length > 0 ? (
        <div className="space-y-2">
          {data.entries.map((entry) => (
            <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-3 gap-2">
              <div>
                <span className="text-sm font-medium">
                  {new Date(entry.date).toLocaleDateString('de-DE')}
                </span>
                {entry.idea_title && (
                  <span className="text-sm text-primary ml-2">→ {entry.idea_title}</span>
                )}
                {entry.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                )}
              </div>
              <button
                onClick={() => removeEntry.mutate(entry.id)}
                className="text-destructive hover:underline text-xs shrink-0"
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>
      )}

      {/* Collaborators */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Mitarbeiter</h3>
        {data.collaborators.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.collaborators.map((c) => (
              <span key={c.id} className="rounded-full bg-muted px-3 py-1 text-xs">
                {c.username} ({c.role})
              </span>
            ))}
          </div>
        )}
        <InviteSection plannerId={plannerId} existingCollaborators={data.collaborators} />
      </div>
    </div>
  );
}

function InviteSection({ plannerId, existingCollaborators }: { plannerId: number; existingCollaborators: { user_id: number }[] }) {
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
          placeholder="Person einladen (Pfadfindername oder E-Mail)..."
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
            onClick={() => { setSelectedUser(null); setQuery(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
          >
            ✕
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
            invite.mutate({ user_id: selectedUser.id, role });
            setSelectedUser(null);
            setQuery('');
          }
        }}
        disabled={!selectedUser || invite.isPending}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
      >
        Einladen
      </button>
    </div>
  );
}
