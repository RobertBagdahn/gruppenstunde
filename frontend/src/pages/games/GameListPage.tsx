/**
 * GameListPage — Listing page for Games with filters.
 * URL-driven filter state for bookmarkability.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGames, useDeleteGame } from '@/api/games';
import ContentCard from '@/components/content/ContentCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorDisplay from '@/components/ErrorDisplay';
import { toast } from 'sonner';
import {
  DIFFICULTY_OPTIONS,
} from '@/schemas/content';
import {
  GAME_TYPE_OPTIONS,
  PLAY_AREA_OPTIONS,
  type GameFilter,
} from '@/schemas/game';

/* ------------------------------------------------------------------ */
/*  URL <-> Filter sync                                                */
/* ------------------------------------------------------------------ */

function filtersFromParams(params: URLSearchParams): Partial<GameFilter> {
  const filters: Partial<GameFilter> = {
    page: 1,
    page_size: 20,
  };
  const q = params.get('q');
  if (q) filters.q = q;
  const gameType = params.get('game_type');
  if (gameType) filters.game_type = gameType;
  const playArea = params.get('play_area');
  if (playArea) filters.play_area = playArea;
  const difficulty = params.get('difficulty');
  if (difficulty) filters.difficulty = difficulty;
  const sort = params.get('sort');
  if (sort) filters.sort = sort;
  const page = params.get('page');
  if (page) filters.page = Number(page);
  return filters;
}

function filtersToParams(filters: Partial<GameFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.game_type) params.set('game_type', filters.game_type);
  if (filters.play_area) params.set('play_area', filters.play_area);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/* ------------------------------------------------------------------ */
/*  Filter select component                                            */
/* ------------------------------------------------------------------ */

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function GameListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = filtersFromParams(searchParams);
  const { data, isLoading, error, refetch } = useGames(filters);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const deleteGame = useDeleteGame(deleteTarget?.id ?? 0);

  useEffect(() => {
    document.title = 'Spiele – Inspi';
  }, []);

  const updateFilter = (key: keyof GameFilter, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined, page: 1 };
    setSearchParams(filtersToParams(newFilters), { replace: true });
  };

  const setPage = (page: number) => {
    const newFilters = { ...filters, page };
    setSearchParams(filtersToParams(newFilters), { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-3xl">sports_esports</span>
          <h1 className="text-2xl md:text-3xl font-extrabold">Spiele</h1>
        </div>
        <p className="text-white/80 text-sm md:text-base max-w-2xl">
          Gelaendespiele, Kennenlernspiele, Kooperationsspiele und mehr.
          Finde das passende Spiel fuer eure naechste Aktion.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Spiel suchen..."
            value={filters.q ?? ''}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <FilterSelect
          label="Spielart"
          value={filters.game_type ?? ''}
          options={GAME_TYPE_OPTIONS}
          onChange={(v) => updateFilter('game_type', v)}
        />
        <FilterSelect
          label="Spielort"
          value={filters.play_area ?? ''}
          options={PLAY_AREA_OPTIONS}
          onChange={(v) => updateFilter('play_area', v)}
        />
        <FilterSelect
          label="Schwierigkeit"
          value={filters.difficulty ?? ''}
          options={DIFFICULTY_OPTIONS}
          onChange={(v) => updateFilter('difficulty', v)}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-muted h-72" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && <ErrorDisplay error={error} onRetry={() => refetch()} />}

      {/* Results */}
      {data && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {data.total} Spiel{data.total !== 1 ? 'e' : ''} gefunden
            </p>
          </div>

          {data.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.items.map((game) => (
                <ContentCard
                  key={game.id}
                  content={game}
                  href={`/games/${game.slug}`}
                  typeLabel={
                    GAME_TYPE_OPTIONS.find((t) => t.value === game.game_type)?.label
                  }
                  typeIcon="sports_esports"
                  typeBadgeColor="text-orange-600"
                  canEdit={game.can_edit}
                  canDelete={game.can_delete}
                  onEdit={() => navigate(`/games/${game.slug}`)}
                  onDelete={() => setDeleteTarget({ id: game.id, title: game.title })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-muted-foreground/50 mb-3 block">
                search_off
              </span>
              <p className="text-muted-foreground font-medium">
                Keine Spiele gefunden.
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Versuche andere Filtereinstellungen.
              </p>
            </div>
          )}

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                Zurueck
              </button>
              <span className="text-sm text-muted-foreground px-3">
                Seite {data.page} von {data.total_pages}
              </span>
              <button
                type="button"
                disabled={data.page >= data.total_pages}
                onClick={() => setPage(data.page + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => {
          deleteGame.mutate(undefined, {
            onSuccess: () => {
              toast.success('Spiel geloescht');
              setDeleteTarget(null);
              refetch();
            },
            onError: (err) => {
              toast.error('Fehler beim Loeschen', { description: err.message });
              setDeleteTarget(null);
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
        title={`"${deleteTarget?.title}" loeschen?`}
        description="Das Spiel wird geloescht und ist nicht mehr sichtbar."
        confirmLabel="Loeschen"
        loading={deleteGame.isPending}
      />
    </div>
  );
}
