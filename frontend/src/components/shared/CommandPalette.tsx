/**
 * CommandPalette — Cmd+K global search and navigation overlay.
 * Uses shadcn/ui Command (cmdk) with autocomplete API + quick actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useUnifiedAutocomplete, type AutocompleteResult } from '@/api/search';
import { getRecentSearches, addRecentSearch } from '@/lib/recentSearches';

// --- Content type metadata ---

const CONTENT_TYPE_ICONS: Record<string, string> = {
  session: 'school',
  game: 'sports_esports',
  blog: 'article',
  recipe: 'restaurant',
  event: 'celebration',
  tag: 'label',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  session: 'Gruppenstunde',
  game: 'Spiel',
  blog: 'Wissensbeitrag',
  recipe: 'Rezept',
  event: 'Aktion',
  tag: 'Tag',
};

// --- Quick actions ---

const QUICK_ACTIONS = [
  { label: 'Neue Gruppenstunde erstellen', icon: 'school', href: '/sessions/new' },
  { label: 'Neues Spiel erstellen', icon: 'sports_esports', href: '/games/new' },
  { label: 'Neues Rezept erstellen', icon: 'restaurant', href: '/recipes/new' },
  { label: 'Neuen Wissensbeitrag erstellen', icon: 'article', href: '/blogs/new' },
];

// --- Page navigation ---

const PAGE_LINKS = [
  { label: 'Startseite', icon: 'home', href: '/' },
  { label: 'Suchen', icon: 'search', href: '/search' },
  { label: 'Gruppenstunden', icon: 'school', href: '/sessions' },
  { label: 'Spiele', icon: 'sports_esports', href: '/games' },
  { label: 'Rezepte', icon: 'restaurant', href: '/recipes' },
  { label: 'Wissensbeiträge', icon: 'article', href: '/blogs' },
  { label: 'Aktionen', icon: 'celebration', href: '/events' },
  { label: 'Gruppenstundenplan', icon: 'calendar_month', href: '/planner' },
  { label: 'Essensplanung', icon: 'restaurant_menu', href: '/meal-plans' },
  { label: 'Packlisten', icon: 'backpack', href: '/packing-lists' },
];

// --- Component ---

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Load recent searches on open
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setQuery('');
      setDebouncedQuery('');
    }
  }, [open]);

  const { data: results } = useUnifiedAutocomplete(debouncedQuery);

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      navigate(href);
    },
    [navigate, onOpenChange],
  );

  const handleSelectResult = useCallback(
    (result: AutocompleteResult) => {
      addRecentSearch(result.title);
      onOpenChange(false);
      navigate(result.url);
    },
    [navigate, onOpenChange],
  );

  const handleSearchRecent = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      setDebouncedQuery(searchQuery);
    },
    [],
  );

  const handleFullSearch = useCallback(() => {
    if (query.trim()) {
      addRecentSearch(query.trim());
      onOpenChange(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }, [query, navigate, onOpenChange]);

  // Group results by content type
  const groupedResults = results?.reduce<Record<string, AutocompleteResult[]>>((groups, result) => {
    const type = result.result_type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(result);
    return groups;
  }, {}) ?? {};

  const hasResults = results && results.length > 0;
  const hasQuery = debouncedQuery.length >= 2;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Suche nach Inhalten, Seiten..."
        value={query}
        onValueChange={setQuery}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !hasResults && query.trim()) {
            handleFullSearch();
          }
        }}
      />
      <CommandList>
        <CommandEmpty>
          {hasQuery ? (
            <div className="space-y-2">
              <p>Keine Ergebnisse für &quot;{debouncedQuery}&quot;</p>
              <button
                type="button"
                onClick={handleFullSearch}
                className="text-sm text-primary hover:underline"
              >
                Erweiterte Suche öffnen
              </button>
            </div>
          ) : (
            <p>Tippe um zu suchen...</p>
          )}
        </CommandEmpty>

        {/* Search results */}
        {hasResults && Object.entries(groupedResults).map(([type, items]) => (
          <CommandGroup key={type} heading={CONTENT_TYPE_LABELS[type] ?? type}>
            {items.map((result) => (
              <CommandItem
                key={`${result.result_type}-${result.id}`}
                value={`${result.title} ${result.result_type}`}
                onSelect={() => handleSelectResult(result)}
              >
                <span className="material-symbols-outlined text-[18px] text-muted-foreground">
                  {CONTENT_TYPE_ICONS[result.result_type] ?? 'description'}
                </span>
                <span className="truncate">{result.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {/* Full search link when results exist */}
        {hasResults && query.trim() && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleFullSearch} value="search-full">
                <span className="material-symbols-outlined text-[18px] text-muted-foreground">search</span>
                <span>Alle Ergebnisse für &quot;{query.trim()}&quot; anzeigen</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* Recent searches (only when no query) */}
        {!hasQuery && recentSearches.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Letzte Suchen">
              {recentSearches.map((search) => (
                <CommandItem
                  key={search}
                  value={`recent-${search}`}
                  onSelect={() => handleSearchRecent(search)}
                >
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">history</span>
                  <span>{search}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Quick actions (only when no query) */}
        {!hasQuery && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Schnellaktionen">
              {QUICK_ACTIONS.map((action) => (
                <CommandItem
                  key={action.href}
                  value={action.label}
                  onSelect={() => handleSelect(action.href)}
                >
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">{action.icon}</span>
                  <span>{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Page navigation */}
        {!hasQuery && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Seiten">
              {PAGE_LINKS.map((page) => (
                <CommandItem
                  key={page.href}
                  value={page.label}
                  onSelect={() => handleSelect(page.href)}
                >
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">{page.icon}</span>
                  <span>{page.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
