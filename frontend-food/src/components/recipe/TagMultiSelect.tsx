import { useState, useRef, useEffect, useMemo } from 'react';
import { useTags } from '@/api/tags';

interface TagMultiSelectProps {
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
}

export default function TagMultiSelect({ selectedSlugs, onToggle }: TagMultiSelectProps) {
  const { data: tags } = useTags();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allTags = useMemo(() => {
    if (!tags) return [];
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  const filtered = useMemo(() => {
    if (!search) return allTags;
    return allTags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [allTags, search]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-muted border border-border rounded-lg hover:bg-border transition-colors whitespace-nowrap"
      >
        <span className="material-symbols-outlined text-[14px]">label</span>
        Tags
        {selectedSlugs.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-4 rounded-full bg-primary text-white text-[10px] px-1 font-bold">
            {selectedSlugs.length}
          </span>
        )}
        <span className={`material-symbols-outlined text-[14px] transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-card border border-border rounded-xl shadow-lg p-2 max-h-80 overflow-hidden flex flex-col">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tag suchen..."
            className="w-full px-3 py-2 mb-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                Keine Tags gefunden
              </p>
            ) : (
              filtered.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm hover:bg-muted rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSlugs.includes(tag.slug)}
                    onChange={() => onToggle(tag.slug)}
                    className="rounded border-muted-foreground accent-primary"
                  />
                  {tag.icon && <span className="material-symbols-outlined text-[16px]">{tag.icon}</span>}
                  {tag.name}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
