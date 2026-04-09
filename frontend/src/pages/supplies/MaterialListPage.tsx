import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMaterials, useSupplySearch } from '@/api/supplies';
import { MATERIAL_CATEGORY_OPTIONS } from '@/schemas/supply';
import ErrorDisplay from '@/components/ErrorDisplay';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categoryLabel(value: string): string {
  const opt = MATERIAL_CATEGORY_OPTIONS.find((o) => o.value === value);
  return opt ? opt.label : value;
}

const CATEGORY_ICONS: Record<string, string> = {
  tools: 'build',
  crafting: 'palette',
  kitchen: 'kitchen',
  outdoor: 'forest',
  stationery: 'edit_note',
  other: 'category',
};

// ---------------------------------------------------------------------------
// MaterialListPage
// ---------------------------------------------------------------------------
export default function MaterialListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven state
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, page, setSearchParams]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error, refetch } = useMaterials(page, 20);

  // Filter client-side if search is active (the paginated API doesn't have a search param yet)
  // For now, use the supply search for quick results
  const { data: searchResults } = useSupplySearch(debouncedSearch);
  const isSearching = debouncedSearch.length >= 2;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-primary">inventory_2</span>
          <h1 className="text-2xl font-bold">Materialien</h1>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined text-lg text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder="Material suchen..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>
      </div>

      {/* Error */}
      {error && !isSearching && (
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      )}

      {/* Loading */}
      {isLoading && !isSearching && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Search Results */}
      {isSearching && (
        <>
          {searchResults && searchResults.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {searchResults.length} Ergebnis{searchResults.length !== 1 ? 'se' : ''} fuer &quot;{debouncedSearch}&quot;
              </p>
              {searchResults.map((material) => {
                const icon = CATEGORY_ICONS[material.material_category] || 'category';
                return (
                  <div
                    key={material.id}
                    className="border rounded-lg p-4 bg-card hover:shadow-md transition cursor-pointer"
                    onClick={() => navigate(`/materials/${material.slug}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary">{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{material.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{categoryLabel(material.material_category)}</span>
                          {material.is_consumable && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              Verbrauch
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-muted-foreground text-lg">
                        chevron_right
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : debouncedSearch.length >= 2 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
                search_off
              </span>
              <h2 className="text-lg font-semibold mb-2">Keine Materialien gefunden</h2>
              <p className="text-muted-foreground text-sm">
                Versuche einen anderen Suchbegriff.
              </p>
            </div>
          ) : null}
        </>
      )}

      {/* Full List (non-search mode) */}
      {!isSearching && !isLoading && !error && data && (
        <>
          {data.items.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
                inventory_2
              </span>
              <h2 className="text-lg font-semibold mb-2">Keine Materialien vorhanden</h2>
              <p className="text-muted-foreground text-sm">
                Materialien werden automatisch erstellt, wenn sie in Gruppenstunden oder Spielen verwendet werden.
              </p>
            </div>
          ) : (
            <>
              {/* Group by category */}
              {(() => {
                const grouped = new Map<string, typeof data.items>();
                data.items.forEach((m) => {
                  const cat = m.material_category;
                  if (!grouped.has(cat)) grouped.set(cat, []);
                  grouped.get(cat)!.push(m);
                });

                return Array.from(grouped.entries()).map(([cat, items]) => {
                  const icon = CATEGORY_ICONS[cat] || 'category';
                  return (
                    <div key={cat} className="mb-6">
                      <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">{icon}</span>
                        {categoryLabel(cat)}
                        <span className="text-xs font-normal">({items.length})</span>
                      </h2>
                      <div className="space-y-2">
                        {items.map((material) => (
                          <div
                            key={material.id}
                            className="border rounded-lg p-4 bg-card hover:shadow-md transition cursor-pointer"
                            onClick={() => navigate(`/materials/${material.slug}`)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate">{material.name}</h3>
                              </div>
                              {material.is_consumable && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                                  Verbrauch
                                </span>
                              )}
                              <span className="material-symbols-outlined text-muted-foreground text-lg shrink-0">
                                chevron_right
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    {data.total} Materialien, Seite {data.page} von {data.total_pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50 hover:bg-muted transition"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <span className="text-sm font-medium px-2">{data.page}</span>
                    <button
                      onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                      disabled={page >= data.total_pages}
                      className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50 hover:bg-muted transition"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
