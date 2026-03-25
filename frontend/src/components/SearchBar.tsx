import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutocomplete } from '@/api/ideas';
import { useIdeaStore } from '@/store/useIdeaStore';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  variant?: 'default' | 'hero';
}

export default function SearchBar({ variant = 'default' }: SearchBarProps) {
  const { searchQuery, setSearchQuery } = useIdeaStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useAutocomplete(localQuery);
  const navigate = useNavigate();
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(localQuery);
    setShowSuggestions(false);
    navigate('/search');
  }

  function handleSelect(_id: number, slug: string) {
    setShowSuggestions(false);
    navigate(`/idea/${slug}`);
  }

  const isHero = variant === 'hero';

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <form onSubmit={handleSubmit} className="flex-1 relative">
          <span className={cn(
            "material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px]",
            isHero ? "text-muted-foreground" : "text-muted-foreground"
          )}>
            search
          </span>
          <input
            type="search"
            placeholder="Suche nach Ideen..."
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className={cn(
              "w-full pl-11 pr-4 rounded-xl focus:outline-none focus:ring-2 transition-all",
              isHero
                ? "py-4 bg-white/95 text-foreground placeholder:text-muted-foreground shadow-lg focus:ring-white/50 text-base"
                : "py-3 bg-background text-foreground placeholder:text-muted-foreground border focus:ring-primary"
            )}
          />
        </form>
        <button
          type="button"
          onClick={() => navigate('/search')}
          title="Erweiterte Suche"
          className={cn(
            "shrink-0 p-2.5 rounded-xl transition-all",
            isHero
              ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
              : "hover:bg-muted border"
          )}
        >
          <span className="material-symbols-outlined text-[24px]">tune</span>
        </button>
      </div>

      {showSuggestions && suggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-card border rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleSelect(item.id, item.slug)}
                className="w-full text-left px-4 py-3 hover:bg-muted text-sm first:rounded-t-xl last:rounded-b-xl transition-colors"
              >
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="text-muted-foreground ml-2 text-xs">{item.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
