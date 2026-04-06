import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUnifiedSearch } from '@/api/search';
import { useIdeaOfTheWeek } from '@/api/ideas';
import { useIdeaStore } from '@/store/useIdeaStore';
import SearchBar from '@/components/SearchBar';
import ErrorDisplay from '@/components/ErrorDisplay';
import {
  RESULT_TYPE_OPTIONS,
  RESULT_TYPE_CONFIG,
  type UnifiedSearchResult,
  type UnifiedSearchFilter,
} from '@/schemas/search';
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
/*  URL ↔ Filter sync helpers                                         */
/* ------------------------------------------------------------------ */
function filtersToSearchParams(filters: Partial<UnifiedSearchFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.result_types?.length) {
    params.set('result_types', filters.result_types.join(','));
  }
  if (filters.sort && filters.sort !== 'relevant') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
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
  return filters;
}

/* ------------------------------------------------------------------ */
/*  Result card                                                        */
/* ------------------------------------------------------------------ */
function ResultCard({ result }: { result: UnifiedSearchResult }) {
  const config = RESULT_TYPE_CONFIG[result.result_type];
  const linkTo = result.url;

  return (
    <Link
      to={linkTo}
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border/50 hover:border-primary/40 hover:shadow-colorful"
    >
      {/* Image area (or placeholder) */}
      <div className="relative overflow-hidden">
        {result.image_url ? (
          <img
            src={result.image_url}
            alt={result.title}
            loading="lazy"
            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-primary/10 via-muted/50 to-secondary/10 flex items-center justify-center">
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

        {/* Like score for ideas */}
        {result.result_type === 'idea' && extra(result, 'like_score') != null && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold text-rose-500 shadow-md">
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
            {extra(result, 'like_score')}
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
          {/* Idea: difficulty + time */}
          {result.result_type === 'idea' && extra(result, 'execution_time') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {extra(result, 'execution_time')}
            </span>
          )}
          {result.result_type === 'idea' && extra(result, 'difficulty') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">signal_cellular_alt</span>
              {extra(result, 'difficulty')}
            </span>
          )}

          {/* Recipe: type + servings */}
          {result.result_type === 'recipe' && extra(result, 'recipe_type') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">restaurant</span>
              {extra(result, 'recipe_type')}
            </span>
          )}
          {result.result_type === 'recipe' && extra(result, 'servings') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">group</span>
              {extra(result, 'servings')} Portionen
            </span>
          )}

          {/* Tag: icon */}
          {result.result_type === 'tag' && extra(result, 'icon') && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">
                {extra(result, 'icon')}
              </span>
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
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Search Page                                                        */
/* ------------------------------------------------------------------ */
export default function SearchPage() {
  const { searchQuery } = useIdeaStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialized = useRef(false);

  // Local filter state (unified search filters)
  const [filters, setFilters] = useState<Partial<UnifiedSearchFilter>>(() => {
    if (searchParams.toString()) {
      return searchParamsToFilters(searchParams);
    }
    return { sort: 'relevant', page: 1, page_size: 20 };
  });

  // Pick up q from the IdeaStore (set by SearchBar)
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
        // Also sync q back to IdeaStore for the SearchBar
        if (parsed.q) {
          useIdeaStore.getState().setSearchQuery(parsed.q);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filters → URL
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

  const { data, isLoading, error, refetch } = useUnifiedSearch(filters);
  const { data: ideaOfTheWeek } = useIdeaOfTheWeek();
  const showIdeaOfTheWeek = ideaOfTheWeek && !filters.q;

  /* -- Filter helpers ------------------------------------------------ */
  function setFilter<K extends keyof UnifiedSearchFilter>(key: K, value: UnifiedSearchFilter[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {}),
    }));
  }

  function toggleResultType(type: string) {
    setFilters((prev) => {
      const current = prev.result_types ?? [];
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...prev, result_types: next.length > 0 ? next : undefined, page: 1 };
    });
  }

  const activeTypes = filters.result_types ?? [];

  /* -- Total label --------------------------------------------------- */
  function getTotalLabel(total: number): string {
    if (activeTypes.length === 1) {
      const opt = RESULT_TYPE_OPTIONS.find((o) => o.value === activeTypes[0]);
      return `${total} ${opt?.label ?? 'Ergebnisse'} gefunden`;
    }
    return `${total} Ergebnis${total !== 1 ? 'se' : ''} gefunden`;
  }

  return (
    <div className="container py-4 md:py-8 px-3 md:px-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl gradient-hero p-4 md:p-8 mb-4 md:mb-8 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 hidden md:block" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4 hidden md:block" />
        <div className="absolute top-10 right-40 w-20 h-20 bg-[hsl(45,93%,58%)]/20 rounded-full hidden md:block" />
        <div className="relative flex items-center gap-4">
          <img
            src="/images/Inspi_filter.png"
            alt="Inspi Suche"
            className="h-20 md:h-28 drop-shadow-lg hidden sm:block"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Suchen</h1>
            {data && (
              <span className="inline-flex items-center gap-1.5 mt-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full px-4 py-1.5">
                <span className="material-symbols-outlined text-[18px]">search</span>
                {getTotalLabel(data.total)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 md:mb-6 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-2xl p-4 md:p-6 border border-primary/10">
        <SearchBar />
      </div>

      {/* Idea of the Week */}
      {showIdeaOfTheWeek && (
        <div className="mb-4 md:mb-6">
          <Link
            to={`/idea/${ideaOfTheWeek.idea.slug}`}
            className="group flex flex-col sm:flex-row items-center gap-4 p-4 md:p-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 shadow-soft hover:shadow-colorful hover:-translate-y-0.5 transition-all overflow-hidden"
          >
            {ideaOfTheWeek.idea.image_url && (
              <img
                src={ideaOfTheWeek.idea.image_url}
                alt={ideaOfTheWeek.idea.title}
                className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform shrink-0"
              />
            )}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start mb-1.5">
                <span
                  className="material-symbols-outlined text-amber-500 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider">
                  Idee der Woche
                </span>
              </div>
              <h3 className="font-extrabold text-base md:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {ideaOfTheWeek.idea.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {ideaOfTheWeek.description || ideaOfTheWeek.idea.summary}
              </p>
            </div>
            <span className="material-symbols-outlined text-amber-500 text-[24px] hidden sm:block shrink-0 group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>
      )}

      {/* Type Filter Chips + Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
        {/* Type chips */}
        <div className="flex flex-wrap gap-2">
          {RESULT_TYPE_OPTIONS.map((opt) => {
            const isActive = activeTypes.includes(opt.value);
            const config = RESULT_TYPE_CONFIG[opt.value];
            return (
              <button
                key={opt.value}
                onClick={() => toggleResultType(opt.value)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition-all',
                  isActive
                    ? cn(config?.bgColor, config?.color, 'shadow-sm')
                    : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent px-4 py-2 rounded-lg shrink-0">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-gradient-to-br from-primary/10 via-muted/50 to-secondary/10 animate-pulse h-72"
            />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-xl border border-dashed border-primary/30">
          <img
            src="/images/inspi_question.png"
            alt="Keine Ergebnisse"
            className="w-40 h-40 object-contain mb-6 drop-shadow-md"
          />
          <p className="text-lg font-semibold text-foreground">Keine Ergebnisse gefunden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Versuch es mit anderen Suchbegriffen oder Filtern.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.items.map((result) => (
            <ResultCard key={`${result.result_type}-${result.id}`} result={result} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-10 bg-gradient-to-r from-transparent via-primary/5 to-transparent py-4 rounded-xl">
          {Array.from({ length: data.total_pages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setFilter('page', i + 1)}
              className={cn(
                'w-10 h-10 rounded-full text-sm font-medium transition-all',
                filters.page === i + 1
                  ? 'gradient-primary text-white shadow-lg shadow-primary/30 scale-110'
                  : 'border bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/30',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
