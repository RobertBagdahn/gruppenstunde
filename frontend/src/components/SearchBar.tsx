import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedAutocomplete, type AutocompleteResult } from '@/api/search';
import { useSearchStore } from '@/store/useSearchStore';
import { RESULT_TYPE_CONFIG } from '@/schemas/search';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  variant?: 'default' | 'hero';
}

export default function SearchBar({ variant = 'default' }: SearchBarProps) {
  const { searchQuery, setSearchQuery } = useSearchStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useUnifiedAutocomplete(localQuery);
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

  function handleSelect(item: AutocompleteResult) {
    setShowSuggestions(false);
    navigate(item.url);
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
            placeholder="Suche nach Ideen, Rezepten, Events..."
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
          {suggestions.map((item) => {
            const config = RESULT_TYPE_CONFIG[item.result_type];
            return (
              <li key={`${item.result_type}-${item.id}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-3 hover:bg-muted text-sm first:rounded-t-xl last:rounded-b-xl transition-colors flex items-center gap-3"
                >
                  {config && (
                    <span className={cn('material-symbols-outlined text-[18px]', config.color)}>
                      {config.icon}
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-foreground truncate block">{item.title}</span>
                  </span>
                  {config && (
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0', config.color, config.bgColor)}>
                      {config.label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
