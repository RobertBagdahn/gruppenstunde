/**
 * InvitationsTab — Admin-only tab showing invited users with their
 * response status (Zugesagt/Offen). Supports filtering and search.
 */
import { useState } from 'react';
import type { EventDetail } from '@/schemas/event';
import { useEventInvitations } from '@/api/events';
import { cn } from '@/lib/utils';

interface Props {
  event: EventDetail;
}

type StatusFilter = '' | 'accepted' | 'pending';

export default function InvitationsTab({ event }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useEventInvitations(event.slug, {
    page,
    pageSize: 20,
    status: statusFilter,
    search,
  });

  const counts = event.invitation_counts;

  const filters: { key: StatusFilter; label: string; count?: number }[] = [
    { key: '', label: 'Alle', count: counts?.total },
    { key: 'accepted', label: 'Zugesagt', count: counts?.accepted },
    { key: 'pending', label: 'Offen', count: counts?.pending },
  ];

  return (
    <div className="space-y-4">
      {/* Filter buttons + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setStatusFilter(f.key);
                setPage(1);
              }}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
                statusFilter === f.key
                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                  : 'hover:bg-muted text-muted-foreground',
              )}
            >
              {f.label}
              {f.count !== undefined && (
                <span className="ml-1.5 text-xs opacity-70">{f.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <div className="relative">
            <span className="material-symbols-outlined text-[18px] text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name oder E-Mail suchen..."
              className="w-full text-sm border rounded-lg pl-9 pr-3 py-2 bg-background"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-14 bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Invitation list */}
      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((inv) => (
            <div
              key={inv.user_id}
              className="flex items-center justify-between border rounded-lg p-3 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {inv.first_name?.[0]}
                  {inv.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {inv.first_name} {inv.last_name}
                    {inv.scout_name && (
                      <span className="text-muted-foreground ml-1">({inv.scout_name})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {inv.group_name && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {inv.group_name}
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    inv.status === 'accepted'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700',
                  )}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {inv.status === 'accepted' ? 'check_circle' : 'schedule'}
                  </span>
                  {inv.status === 'accepted' ? 'Zugesagt' : 'Offen'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {data && data.items.length === 0 && (
        <div className="rounded-xl border p-6 text-center">
          <span className="material-symbols-outlined text-[40px] text-muted-foreground mb-2">
            person_search
          </span>
          <p className="text-sm text-muted-foreground">
            {search
              ? 'Keine Eingeladenen gefunden.'
              : 'Noch niemand eingeladen.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Seite {data.page} von {data.total_pages} ({data.total} gesamt)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-2 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= data.total_pages}
              className="px-2 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
