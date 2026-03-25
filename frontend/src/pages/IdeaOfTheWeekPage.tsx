import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useIdeasOfTheWeek, useSetIdeaOfWeek, useRemoveIdeaOfWeek } from '@/api/admin';
import { useAutocomplete } from '@/api/ideas';
import type { Autocomplete } from '@/schemas/idea';

export default function IdeaOfTheWeekPage() {
  const { data: entries, isLoading } = useIdeasOfTheWeek();
  const addEntry = useSetIdeaOfWeek();
  const removeEntry = useRemoveIdeaOfWeek();
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
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

  return (
    <div>

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
            placeholder="Beschreibung (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div ref={ideaRef} className="relative flex-1">
            <input
              type="text"
              placeholder="Idee suchen..."
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
              if (date && selectedIdea) {
                addEntry.mutate({
                  idea_id: selectedIdea.id,
                  release_date: date,
                  description,
                });
                setDate('');
                setDescription('');
                setSelectedIdea(null);
                setIdeaQuery('');
              }
            }}
            disabled={!date || !selectedIdea}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="animate-pulse h-64 bg-muted rounded" />
      ) : entries && entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <span className="text-sm font-medium">
                  {new Date(entry.release_date).toLocaleDateString('de-DE')}
                </span>
                <Link to={`/idea/${entry.idea.slug}`} className="text-sm text-primary ml-2 hover:underline">→ {entry.idea.title}</Link>
                {entry.description && (
                  <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
                )}
              </div>
              <button
                onClick={() => removeEntry.mutate(entry.id)}
                className="text-destructive hover:underline text-xs"
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>
      )}
    </div>
  );
}
