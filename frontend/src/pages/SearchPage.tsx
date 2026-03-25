import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIdeas } from '@/api/ideas';
import { useIdeaStore, filtersToSearchParams } from '@/store/useIdeaStore';
import IdeaCard from '@/components/IdeaCard';
import IdeaFilterSidebar from '@/components/IdeaFilterSidebar';
import SearchBar from '@/components/SearchBar';
import { SORT_OPTIONS, IDEA_TYPE_OPTIONS } from '@/schemas/idea';

export default function SearchPage() {
  const { filters, setFilter, initFromUrlParams } = useIdeaStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialized = useRef(false);
  const { data, isLoading } = useIdeas(filters);

  // On mount: initialize store from URL params
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (searchParams.toString()) {
        initFromUrlParams(searchParams);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync store filters → URL params
  useEffect(() => {
    if (initialized.current) {
      const newParams = filtersToSearchParams(filters);
      setSearchParams(newParams, { replace: true });
    }
  }, [filters, setSearchParams]);

  useEffect(() => {
    const q = filters.q;
    const typeLabel = IDEA_TYPE_OPTIONS.find((o) => o.value === filters.idea_type)?.label;
    const prefix = typeLabel ?? 'Ideen';
    document.title = q ? `"${q}" suchen – Inspi` : `${prefix} suchen – Inspi`;
    return () => { document.title = 'Inspi – Gruppenstunden-Inspirator'; };
  }, [filters.q, filters.idea_type]);

  return (
    <div className="container py-4 md:py-8 px-3 md:px-4">
      {/* Colorful Page Header */}
      <div className="relative overflow-hidden rounded-2xl gradient-hero p-4 md:p-8 mb-4 md:mb-8 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 hidden md:block" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4 hidden md:block" />
        <div className="absolute top-10 right-40 w-20 h-20 bg-[hsl(45,93%,58%)]/20 rounded-full hidden md:block" />
        <div className="relative flex items-center gap-4">
          <img
            src="/images/Inspi_filter.png"
            alt="Inspi Filter"
            className="h-20 md:h-28 drop-shadow-lg hidden sm:block"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {IDEA_TYPE_OPTIONS.find((o) => o.value === filters.idea_type)?.label ?? 'Ideen'} suchen
            </h1>
            {data && (
              <span className="inline-flex items-center gap-1.5 mt-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full px-4 py-1.5">
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                {data.total} Idee{data.total !== 1 ? 'n' : ''} gefunden
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 md:mb-8 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-2xl p-4 md:p-6 border border-primary/10">
        <SearchBar />
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Filter Sidebar */}
        <IdeaFilterSidebar />

        {/* Results */}
        <div className="flex-1">
          {/* Sort */}
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent px-4 py-2 rounded-lg">
              <span className="material-symbols-outlined text-primary text-[18px]">sort</span>
              <select
                value={filters.sort ?? 'newest'}
                onChange={(e) => setFilter('sort', e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm bg-card focus:ring-2 focus:ring-primary focus:outline-none font-medium"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-gradient-to-br from-primary/10 via-muted/50 to-secondary/10 animate-pulse h-72" />
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-xl border border-dashed border-primary/30">
              <img
                src="/images/inspi_question.png"
                alt="Keine Ergebnisse"
                className="w-40 h-40 object-contain mb-6 drop-shadow-md"
              />
              <p className="text-lg font-semibold text-foreground">
                Keine Ideen gefunden
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Versuch es mit anderen Suchbegriffen oder Filtern.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.items.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
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
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                    filters.page === i + 1
                      ? 'gradient-primary text-white shadow-lg shadow-primary/30 scale-110'
                      : 'border bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
