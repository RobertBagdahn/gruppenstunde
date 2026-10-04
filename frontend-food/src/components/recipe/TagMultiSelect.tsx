import { useState, useRef, useEffect, useMemo } from 'react';
import { useTags } from '@/api/tags';
import { Icon } from '@/components/ui/icon';

interface TagMultiSelectProps {
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  valueKey?: 'slug' | 'id';
}

export default function TagMultiSelect({ selectedSlugs, onToggle, valueKey = 'slug' }: TagMultiSelectProps) {
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-medium bg-muted border border-border rounded-lg hover:bg-border transition-colors whitespace-nowrap"
      >
        <Icon name="label" size={16} />
        Tags
        {selectedSlugs.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-4 rounded-full bg-primary text-white text-caption px-1 font-bold">
            {selectedSlugs.length}
          </span>
        )}
        <Icon name="expand_more" size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-card rounded-xl shadow-lg p-2 max-h-80 overflow-hidden flex flex-col shadow-card">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tag suchen..."
            className="w-full px-3 py-2 mb-2 text-body bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {filtered.length === 0 ? (
              <p className="text-body text-muted-foreground px-2 py-4 text-center">
                Keine Tags gefunden
              </p>
            ) : (
              filtered.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-body hover:bg-muted rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                  checked={selectedSlugs.includes(valueKey === 'id' ? tag.id : tag.slug)}
                  onChange={() => onToggle(valueKey === 'id' ? tag.id : tag.slug)}
                    className="rounded-lg border-muted-foreground accent-primary"
                  />
                  {tag.icon && <Icon name={tag.icon} size={16} />}
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
