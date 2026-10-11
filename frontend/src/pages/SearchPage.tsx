import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUnifiedSearch } from '@/api/search';
import { useCurrentUser } from '@/api/auth';
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
import { filtersToSearchParams, searchParamsToFilters } from '@/lib/searchUrlState';
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
  // The URL is the single source of truth for all search filters.
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: currentUser } = useCurrentUser();
  const isAuthenticated = !!currentUser;

  const filters = useMemo(() => searchParamsToFilters(searchParams), [searchParams]);

  /** Apply a filter change to the URL; any change except paging resets to page 1. */
  function updateFilters(patch: Partial<UnifiedSearchFilter>) {
    setSearchParams(filtersToSearchParams({ ...filters, page: 1, ...patch }));
  }

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
        <SearchBar query={filters.q ?? ''} onSearch={(q) => updateFilters({ q: q || undefined })} />
      </div>

      {/* Active tag filters */}
      {filters.tag_slugs && filters.tag_slugs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {filters.tag_slugs.map((slug) => (
            <span
              key={slug}
              className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">label</span>
              {slug}
              <button
                type="button"
                onClick={() => {
                  const remaining = filters.tag_slugs?.filter((s) => s !== slug) ?? [];
                  updateFilters({ tag_slugs: remaining.length > 0 ? remaining : undefined });
                }}
                aria-label={`Tag-Filter „${slug}“ entfernen`}
                className="ml-1 rounded-full hover:bg-primary/20"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Tabs + Sort */}
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        {/* Tabs row */}
        <SearchTabs
          activeTypes={activeTypes}
          typeCounts={typeCounts}
          onTypeChange={(types) =>
            updateFilters({ result_types: types.length > 0 ? types : undefined })
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
                onCheckedChange={(checked) => updateFilters({ scope: checked ? 'mine' : undefined })}
              />
              <Label htmlFor="scope-mine" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                Nur meine Beiträge
              </Label>
            </div>
          )}

          <span className="material-symbols-outlined text-primary text-[18px]">sort</span>
          <select
            value={filters.sort ?? 'relevant'}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            aria-label="Sortierung"
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
        onPageChange={(page) => updateFilters({ page })}
      />
    </div>
  );
}
