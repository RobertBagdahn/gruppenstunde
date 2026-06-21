import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUnifiedSearch } from '@/api/search';
import { useCurrentUser } from '@/api/auth';
import { useSearchStore } from '@/store/useSearchStore';
import SearchBar from '@/components/SearchBar';
import { SearchTabs } from '@/components/search/SearchTabs';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ListPageHero from '@/components/shared/ListPageHero';
import EmptyState from '@/components/shared/EmptyState';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  RESULT_TYPE_CONFIG,
  type UnifiedSearchResult,
  type UnifiedSearchFilter,
} from '@/schemas/search';
import { EntityLink } from '@/components/shared/EntityLink';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import type { EntityType } from '@/lib/entityUrls';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Safely extract a string from extra record (unknown values). */
function extra(result: UnifiedSearchResult, key: string): string | null {
  const v = result.extra[key];
  if (v == null) return null;
  return String(v);
}

/* ------------------------------------------------------------------ */
/*  Sort options                                                       */
/* ------------------------------------------------------------------ */
const SORT_OPTIONS = [
  { value: 'relevant', label: 'Relevanz' },
  { value: 'newest', label: 'Neueste' },
];

/* ------------------------------------------------------------------ */
/*  URL <-> Filter sync helpers                                        */
/* ------------------------------------------------------------------ */
function filtersToSearchParams(filters: Partial<UnifiedSearchFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.result_types?.length) {
    params.set('result_types', filters.result_types.join(','));
  }
  if (filters.sort && filters.sort !== 'relevant') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.scope === 'mine') params.set('scope', 'mine');
  return params;
}

function searchParamsToFilters(params: URLSearchParams): Partial<UnifiedSearchFilter> {
  const filters: Partial<UnifiedSearchFilter> = {
    sort: 'relevant',
    page: 1,
    page_size: 20,
  };
  const q = params.get('q');
  if (q) filters.q = q;
  const resultTypes = params.get('result_types');
  if (resultTypes) filters.result_types = resultTypes.split(',');
  const sort = params.get('sort');
  if (sort) filters.sort = sort;
  const page = params.get('page');
  if (page) filters.page = Number(page);
  const scope = params.get('scope');
  if (scope === 'mine') filters.scope = 'mine';
  return filters;
}

/* ------------------------------------------------------------------ */
/*  Result card                                                        */
/* ------------------------------------------------------------------ */
function ResultCard({ result }: { result: UnifiedSearchResult }) {
  const config = RESULT_TYPE_CONFIG[result.result_type];

  return (
    <EntityLink
      type={result.result_type as EntityType}
      slug={result.slug}
      name={result.title}
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border/50 hover:border-primary/40 hover:shadow-colorful"
    >
      {/* Image area (or placeholder) */}
      <div className="relative overflow-hidden aspect-square">
        {result.image_url ? (
          <img
            src={result.image_url}
            alt={result.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-muted/50 to-secondary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-muted-foreground/40">
              {config?.icon ?? 'article'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Type badge */}
        {config && (
          <div
            className={cn(
              'absolute top-3 left-3 flex items-center gap-1 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold shadow-md border',
              config.bgColor,
              config.color,
            )}
          >
            <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
            {config.label}
          </div>
        )}

        {/* Draft badge */}
        {result.status === 'draft' && (
          <div className="absolute top-3 right-3 flex items-center gap-1 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold shadow-md border bg-amber-50 border-amber-300 text-amber-700">
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
            Entwurf
          </div>
        )}

      </div>

      <div className="p-5">
        <h3 className="font-extrabold text-base group-hover:text-primary transition-colors line-clamp-2">
          {result.title}
        </h3>

        {result.summary && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{result.summary}</p>
        )}

        {/* Meta info per type */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Session: type + time + difficulty */}
          {result.result_type === 'session' && extra(result, 'execution_time') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {extra(result, 'execution_time')}
            </span>
          )}
          {result.result_type === 'session' && extra(result, 'difficulty') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">signal_cellular_alt</span>
              {extra(result, 'difficulty')}
            </span>
          )}

          {/* Blog: type + reading time */}
          {result.result_type === 'blog' && extra(result, 'reading_time_minutes') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {extra(result, 'reading_time_minutes')} Min. Lesezeit
            </span>
          )}

          {/* Game: type + players + play area */}
          {result.result_type === 'game' && extra(result, 'game_type') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">sports_esports</span>
              {extra(result, 'game_type')}
            </span>
          )}
          {result.result_type === 'game' && extra(result, 'min_players') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">group</span>
              {extra(result, 'min_players')}{extra(result, 'max_players') ? `–${extra(result, 'max_players')}` : '+'} Spieler
            </span>
          )}
          {result.result_type === 'game' && extra(result, 'play_area') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">landscape</span>
              {extra(result, 'play_area')}
            </span>
          )}

          {/* Event: date + location */}
          {result.result_type === 'event' && extra(result, 'start_date') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              {new Date(extra(result, 'start_date')!).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          )}
          {result.result_type === 'event' && extra(result, 'location') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {extra(result, 'location')}
            </span>
          )}
        </div>
      </div>
    </EntityLink>
  );
}

/* ------------------------------------------------------------------ */
/*  Search Page                                                        */
/* ------------------------------------------------------------------ */
export default function SearchPage() {
  const { searchQuery } = useSearchStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialized = useRef(false);
  const { data: currentUser } = useCurrentUser();
  const isAuthenticated = !!currentUser;

  // Local filter state (unified search filters)
  const [filters, setFilters] = useState<Partial<UnifiedSearchFilter>>(() => {
    if (searchParams.toString()) {
      return searchParamsToFilters(searchParams);
    }
    return { sort: 'relevant', page: 1, page_size: 20 };
  });

  // Pick up q from the SearchStore (set by SearchBar)
  useEffect(() => {
    if (searchQuery !== (filters.q ?? '')) {
      setFilters((prev) => ({ ...prev, q: searchQuery || undefined, page: 1 }));
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init from URL on first mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (searchParams.toString()) {
        const parsed = searchParamsToFilters(searchParams);
        setFilters(parsed);
        // Also sync q back to SearchStore for the SearchBar
        if (parsed.q) {
          useSearchStore.getState().setSearchQuery(parsed.q);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filters -> URL
  useEffect(() => {
    if (initialized.current) {
      const newParams = filtersToSearchParams(filters);
      setSearchParams(newParams, { replace: true });
    }
  }, [filters, setSearchParams]);

  // Document title
  useEffect(() => {
    const q = filters.q;
    document.title = q ? `"${q}" suchen – Inspi` : 'Suchen – Inspi';
    return () => {
      document.title = 'Inspi – Gruppenstunden-Inspirator';
    };
  }, [filters.q]);

  // For anonymous users, strip scope=mine (task 5.5)
  const effectiveFilters = !isAuthenticated && filters.scope === 'mine'
    ? { ...filters, scope: undefined as UnifiedSearchFilter['scope'] }
    : filters;

  const { data, isLoading, error, refetch } = useUnifiedSearch(effectiveFilters);

  /* -- Filter helpers ------------------------------------------------ */
  function setFilter<K extends keyof UnifiedSearchFilter>(key: K, value: UnifiedSearchFilter[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {}),
    }));
  }

  const activeTypes = filters.result_types ?? [];
  const typeCounts = data?.type_counts ?? {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      {/* Hero Header */}
      <ListPageHero
        title="Suchen"
        description=""
        icon="search"
        gradientClasses="gradient-hero"
        mascotSrc="/images/inspi_filter.png"
        mascotAlt="Inspi Suche"
        totalCount={data?.total}
        countLabel="Ergebnis"
        countIcon="search"
      />

      {/* Search Bar */}
      <div className="mb-4 md:mb-6 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-2xl p-4 md:p-6 border border-primary/10">
        <SearchBar />
      </div>

      {/* Search Tabs + Sort */}
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        {/* Tabs row */}
        <SearchTabs
          activeTypes={activeTypes}
          typeCounts={typeCounts}
          onTypeChange={(types) =>
            setFilters((prev) => ({
              ...prev,
              result_types: types.length > 0 ? types : undefined,
              page: 1,
            }))
          }
          totalCount={data?.total ?? 0}
        />

        {/* Sort + Mine toggle */}
        <div className="flex items-center gap-4 self-end">
          {/* Mine toggle (only for authenticated users) */}
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <Switch
                id="scope-mine"
                checked={filters.scope === 'mine'}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    scope: checked ? 'mine' : undefined,
                    page: 1,
                  }))
                }
              />
              <Label htmlFor="scope-mine" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                Nur meine Beiträge
              </Label>
            </div>
          )}

          <span className="material-symbols-outlined text-primary text-[18px]">sort</span>
          <select
            value={filters.sort ?? 'relevant'}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-card focus:ring-2 focus:ring-primary focus:outline-none font-medium"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {error ? (
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-gradient-to-br from-primary/10 via-muted/50 to-secondary/10 animate-pulse h-96"
            />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <EmptyState
          mascotSrc="/images/inspi_question.png"
          mascotAlt="Keine Ergebnisse"
          title="Keine Ergebnisse gefunden"
          description="Versuch es mit anderen Suchbegriffen oder Filtern."
        />
      ) : (
        <EntityLinkContext.Provider value="list">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {data?.items.map((result) => (
              <ResultCard key={`${result.result_type}-${result.id}`} result={result} />
            ))}
          </div>
        </EntityLinkContext.Provider>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={filters.page ?? 1}
        totalPages={data?.total_pages ?? 1}
        onPageChange={(page) => setFilter('page', page)}
      />
    </div>
  );
}
