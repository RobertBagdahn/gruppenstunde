/**
 * ShoppingListPage — List view of all shopping lists (own + shared).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Utensils, Calendar, Edit3, Users, CheckCircle2, ArrowUpDown, Trash2, User as UserIcon, Store as StoreIcon } from 'lucide-react';
import {
  useShoppingLists,
  useCreateShoppingList,
  useDeleteShoppingList,
} from '@/api/shoppingLists';
import { useShoppingEvents } from '@/api/shoppingTrips';
import RecipePurchaseDialog from '@/components/shopping/RecipePurchaseDialog';
import { Button } from '@/components/ui/button';
import { formatDateRange, formatTripTime, formatWeekdayClock } from '@/lib/tripTime';
import { plural } from '@/lib/format';
import type { ShoppingEvent } from '@/schemas/shoppingTrip';
import { useCurrentUser } from '@/api/auth';
import { SOURCE_TYPE_LABELS } from '@/schemas/shoppingList';
import type { ShoppingList } from '@/schemas/shoppingList';
import ShoppingListProgress from '@/components/shopping/ShoppingListProgress';
import Pagination from '@/components/shared/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import ActiveFiltersHint from '@/components/shared/ActiveFiltersHint';
import { ShoppingListStateSchema } from '@/schemas/listState';
import { usePersistedListState, useDebouncedSearchInput } from '@/hooks/usePersistedListState';
import EmptyState from '@/components/shared/EmptyState';
import SourceFreshnessNotice from '@/components/shopping/SourceFreshnessNotice';
import UnauthGate from '@/components/shared/UnauthGate';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { SkeletonCardGrid } from '@/components/ui/skeleton';

function ShoppingListCard({ list, onDelete }: { list: ShoppingList; onDelete: (list: ShoppingList) => void }) {
  const sourceLabel = SOURCE_TYPE_LABELS[list.source_type] ?? list.source_type;
  const updatedAt = new Date(list.updated_at);
  const timeAgo = getTimeAgo(updatedAt);

  const SourceIcon = list.source_type === 'recipe'
    ? Utensils
    : list.source_type === 'meal_event' || list.source_type === 'event_trip'
      ? Calendar
      : Edit3;

  return (
    <div className="group relative rounded-xl border border-border bg-card shadow-soft transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5">
      <Link
        to={`/shopping-lists/${list.id}`}
        className={cn('block rounded-xl p-5', list.can_delete && 'pr-14')}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-emphasis text-foreground truncate group-hover:text-primary transition-colors">
              {list.name}
            </h3>
            {list.event_name && (
              <p className="mt-1 truncate text-caption font-semibold text-primary">{list.event_name}</p>
            )}
            {(list.store_name || list.scheduled_at) && (
              <p className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                <StoreIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {[list.store_name, formatTripTime(list.scheduled_at)].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-caption font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <SourceIcon className="w-3.5 h-3.5 text-primary" />
                {sourceLabel}
              </span>
              <span>•</span>
              <span>{timeAgo}</span>
              {list.collaborators_count > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {list.collaborators_count}
                  </span>
                </>
              )}
            </div>
          </div>
          {list.items_count === list.checked_count && list.items_count > 0 && (
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          )}
        </div>

        <ShoppingListProgress
          checked={list.checked_count}
          total={list.items_count}
          className="mt-4"
        />
      </Link>
      <SourceFreshnessNotice
        status={list.source_status}
        isEventTrip={list.source_type === 'event_trip' || list.event_id !== null}
        diffListId={list.id}
        eventSlug={list.event_slug}
        className="mx-5 mb-5 -mt-1"
      />
      {list.can_delete && (
        <button
          type="button"
          onClick={() => onDelete(list)}
          aria-label={`Einkaufsliste „${list.name}“ löschen`}
          title="Einkaufsliste löschen"
          className="absolute right-3 top-3 flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function EventCard({ event }: { event: ShoppingEvent }) {
  return (
    <Link
      to={`/shopping-lists/events/${event.slug}`}
      className="card-hover press block rounded-xl bg-card p-5 shadow-card transition-all hover:border-primary/40"
    >
      <h3 className="truncate font-display text-emphasis font-bold text-foreground">{event.name}</h3>
      <p className="mt-1 text-caption font-semibold text-muted-foreground">{formatDateRange(event.start_date, event.end_date)}</p>
      <p className="mt-3 text-body font-semibold text-foreground">
        {event.trips_count === 0 ? 'Noch kein Einkauf' : plural(event.trips_count, 'Einkauf', 'Einkäufe')}
      </p>
      {event.next_trip && (
        <p className="mt-1 text-caption text-muted-foreground">
          Nächster: {event.next_trip.store_name} · {formatWeekdayClock(event.next_trip.scheduled_at)}
        </p>
      )}
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'gestern';
  if (diffD < 7) return `vor ${diffD} Tagen`;
  return date.toLocaleDateString('de-DE');
}

const SHOPPING_LIST_DEFAULTS = { sort: 'newest', page: 1 } as const;
const PAGE_ONLY = ['page'] as const;

export default function ShoppingListPage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { state, patch, reset, activeCount, restored } = usePersistedListState({
    key: 'shopping-lists',
    schema: ShoppingListStateSchema,
    defaults: SHOPPING_LIST_DEFAULTS,
    persistExclude: PAGE_ONLY,
    countExclude: PAGE_ONLY,
  });
  const { page, sort } = state;
  const q = state.q ?? '';
  const myDataOnly = state.mine === '1';

  const includePast = state.include_past === 'true';

  const { data, isPending: isLoading, error } = useShoppingLists(
    page,
    20,
    { q, sort, mine: myDataOnly, withoutEvent: true },
    { enabled: restored && !!user },
  );
  const events = useShoppingEvents(1, 20, includePast, restored && !!user);
  const invited = useShoppingLists(1, 20, { invitedTrips: true }, { enabled: restored && !!user });
  const createList = useCreateShoppingList();
  const deleteList = useDeleteShoppingList();
  const [showRecipePurchase, setShowRecipePurchase] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ShoppingList | null>(null);
  const search = useDebouncedSearchInput(q, (value) => {
    patch({ q: value || undefined, page: undefined }, { replace: true });
  });

  if (userLoading || !restored) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <PageHeader title="Einkaufslisten" description="Plane die Einkäufe deiner Events und verwalte deine Listen." countLoading />
        <SkeletonCardGrid count={6} withImage={false} label="Einkaufslisten werden geladen" className="lg:grid-cols-3 xl:grid-cols-3" />
      </div>
    );
  }

  if (!user) {
    return (
      <UnauthGate
        title="Einkaufslisten"
        description="Melde dich an, um deine Einkaufslisten zu sehen."
      />
    );
  }

  const lists = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-destructive text-body">Einkaufslisten konnten nicht geladen werden.</p>
      </div>
    );
  }

  // Search, sort and the owner filter are applied by the server across all pages.
  const sortedLists = lists;

  const handleCreate = () => {
    if (!newName.trim()) return;
    createList.mutate(
      { name: newName.trim() },
      {
        onSuccess: (created) => {
          notify.success('Einkaufsliste erstellt');
          setNewName('');
          setShowCreate(false);
          navigate(`/shopping-lists/${created.id}`);
        },
        onError: (err) => notify.error('Einkaufsliste konnte nicht angelegt werden', { error: err }),
      },
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 font-sans">
      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={() => {
          if (deleteTarget !== null) {
            deleteList.mutate(deleteTarget.id, {
              onSuccess: () => {
                notify.success('Einkaufsliste gelöscht');
                setDeleteTarget(null);
              },
              onError: (err) => {
                notify.error('Einkaufsliste konnte nicht gelöscht werden', { error: err });
                setDeleteTarget(null);
              },
            });
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        title={deleteTarget ? `Einkaufsliste „${deleteTarget.name}“ löschen?` : 'Einkaufsliste löschen?'}
        description="Die Einkaufsliste und alle Einträge werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteList.isPending}
      />

      {/* Hero */}
      <PageHeader
        title="Einkaufslisten"
        description="Plane die Einkäufe deiner Events und verwalte deine Listen."
        count={data?.total}
        countLabel={{ one: 'Liste', other: 'Listen' }}
      >
        <ListPageSearchBar
          placeholder="Einkaufsliste suchen..."
          value={search.input}
          onChange={search.setInput}
          onSubmit={search.submit}
          createLabel="Freie Liste"
          onCreateClick={() => setShowCreate(true)}
        />
      </PageHeader>

      {/* Event selection */}
      <section aria-labelledby="events-heading" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="events-heading" className="font-display text-section font-extrabold text-foreground">
            Für welches Event kaufst du ein?
          </h2>
          <Button
            type="button"
            size="sm"
            variant={includePast ? 'secondary' : 'outline'}
            aria-pressed={includePast}
            onClick={() => patch({ include_past: includePast ? undefined : 'true' })}
          >
            Vergangene Events zeigen
          </Button>
        </div>
        {events.isPending ? (
          <SkeletonCardGrid count={3} withImage={false} label="Events werden geladen" />
        ) : events.isError ? (
          <p role="alert" className="text-body text-destructive">Events konnten nicht geladen werden.</p>
        ) : events.data.items.length === 0 ? (
          <EmptyState
            icon="calendar_month"
            title="Noch kein Event mit Essensplan"
            description="Verknüpfe einen Essensplan mit einem Event, dann kannst du hier die Einkäufe planen."
            ctaLabel="Zu den Essensplänen"
            ctaHref="/meal-plans"
          />
        ) : (
          <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.data.items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Trips the user was invited to */}
      {invited.data && invited.data.items.length > 0 && (
        <section aria-labelledby="invited-heading" className="mb-8">
          <h2 id="invited-heading" className="mb-3 font-display text-section font-extrabold text-foreground">
            Einkäufe, zu denen du eingeladen bist
          </h2>
          <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invited.data.items.map((list) => (
              <ShoppingListCard key={list.id} list={list} onDelete={setDeleteTarget} />
            ))}
          </div>
        </section>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-section font-extrabold text-foreground">Einkaufslisten ohne Event</h2>
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowRecipePurchase(true)}>
          Einkauf aus Rezepten
        </Button>
      </div>

      <ActiveFiltersHint activeCount={activeCount} onReset={reset} />

      {/* My Data + Sort */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => patch({ mine: myDataOnly ? undefined : '1' })}
          className={[
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-body font-semibold border transition-all shadow-soft',
            myDataOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40',
          ].join(' ')}
        >
          <UserIcon className="w-4 h-4" />
          Meine Daten
        </button>
        <div className="flex items-center gap-2 bg-card shadow-soft px-4 py-2 rounded-xl">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          <select
            value={sort}
            onChange={(e) => patch({ sort: ShoppingListStateSchema.shape.sort.parse(e.target.value) })}
            className="min-h-11 md:min-h-0 px-3.5 py-1.5 rounded-xl border border-border text-body bg-card hover:bg-muted/50 focus:ring-2 focus:ring-primary focus:outline-none font-semibold transition-all shadow-soft"
          >
            <option value="newest">Neueste</option>
            <option value="oldest">Älteste</option>
            <option value="name_asc">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 p-5 bg-card rounded-xl shadow-card">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name der Einkaufsliste"
              className="flex-1 px-3.5 py-2 text-body border border-border rounded-xl bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCreate}
                disabled={createList.isPending || !newName.trim()}
                className="px-4 py-2 text-body font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
              >
                Erstellen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                }}
                className="px-4 py-2 text-body font-semibold border border-border rounded-xl hover:bg-muted bg-card transition-all shadow-soft"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading && !data ? (
        <SkeletonCardGrid count={3} withImage={false} label="Einkaufslisten werden geladen" />
      ) : sortedLists.length === 0 ? (
        <EmptyState
          icon="shopping_cart"
          title="Noch keine Einkaufslisten ohne Event"
          description={
            q
              ? 'Keine Einkaufslisten für diese Suche gefunden.'
              : 'Lege eine freie Liste an oder kaufe ein Rezept ein.'
          }
          ctaLabel="Freie Liste erstellen"
          onCtaClick={() => setShowCreate(true)}
        />
      ) : (
        <div className="stagger grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sortedLists.map((list) => (
            <ShoppingListCard key={list.id} list={list} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <RecipePurchaseDialog
        open={showRecipePurchase}
        onOpenChange={setShowRecipePurchase}
        allowExisting={false}
        onDone={(list) => navigate(`/shopping-lists/${list.id}`)}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(newPage) => patch({ page: newPage })}
      />
    </div>
  );
}
