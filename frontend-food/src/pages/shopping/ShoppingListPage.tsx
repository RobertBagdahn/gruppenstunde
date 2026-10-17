/**
 * ShoppingListPage — List view of all shopping lists (own + shared).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Utensils, Calendar, Edit3, Users, CheckCircle2, ArrowUpDown, Trash2, User as UserIcon } from 'lucide-react';
import {
  useShoppingLists,
  useCreateShoppingList,
  useDeleteShoppingList,
  useCreateFromMealPlan,
} from '@/api/shoppingLists';
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

function ShoppingListCard({
  list,
  onDelete,
  onCreateNew,
  creatingNew,
}: {
  list: ShoppingList;
  onDelete: (list: ShoppingList) => void;
  onCreateNew: (list: ShoppingList) => void;
  creatingNew: boolean;
}) {
  const sourceLabel = SOURCE_TYPE_LABELS[list.source_type] ?? list.source_type;
  const updatedAt = new Date(list.updated_at);
  const timeAgo = getTimeAgo(updatedAt);

  const SourceIcon = list.source_type === 'recipe'
    ? Utensils
    : list.source_type === 'meal_event'
      ? Calendar
      : Edit3;

  return (
    <div className="relative">
      <Link
        to={`/shopping-lists/${list.id}`}
        className={cn(
          'group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 shadow-soft transition-all',
          list.can_delete && 'pr-14',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-emphasis text-foreground truncate group-hover:text-primary transition-colors">
              {list.name}
            </h3>
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
        pending={creatingNew}
        className="mt-2"
        onCreateNew={list.source_id ? () => onCreateNew(list) : undefined}
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

  const { data, isPending: isLoading, error } = useShoppingLists(page, 20, { q, sort, mine: myDataOnly }, { enabled: restored });
  const createList = useCreateShoppingList();
  const deleteList = useDeleteShoppingList();
  const createFromMealPlan = useCreateFromMealPlan();
  const [creatingFromListId, setCreatingFromListId] = useState<number | null>(null);
  const createNewFromPlan = (source: ShoppingList) => {
    if (!source.source_id) return;
    setCreatingFromListId(source.id);
    createFromMealPlan.mutate(
      { mealPlanId: source.source_id },
      {
        onSuccess: (created) => {
          notify.success('Neue Einkaufsliste erstellt');
          navigate(`/shopping-lists/${created.id}`, { state: { mealPlanId: source.source_id } });
        },
        onError: (err) => notify.error('Einkaufsliste konnte nicht angelegt werden', { error: err }),
        onSettled: () => setCreatingFromListId(null),
      },
    );
  };

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ShoppingList | null>(null);
  const search = useDebouncedSearchInput(q, (value) => {
    patch({ q: value || undefined, page: undefined }, { replace: true });
  });

  if (userLoading || !restored || (isLoading && !data)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <PageHeader title="Einkaufslisten" description="Erstelle und verwalte deine Einkaufslisten." area="shopping" icon="shopping_cart" countLoading />
        <SkeletonCardGrid count={6} withImage={false} label="Einkaufslisten werden geladen" className="lg:grid-cols-3 xl:grid-cols-3" />
      </div>
    );
  }

  if (!user) {
    return (
      <UnauthGate
        title="Einkaufslisten"
        description="Melde dich an, um Einkaufslisten zu erstellen und mit anderen zu teilen."
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
        description="Erstelle und verwalte deine Einkaufslisten."
        area="shopping"
        icon="shopping_cart"
        count={data?.total}
        countLabel={{ one: 'Liste', other: 'Listen' }}
      >
        <ListPageSearchBar
          placeholder="Einkaufsliste suchen..."
          value={search.input}
          onChange={search.setInput}
          onSubmit={search.submit}
          createLabel="Neue Liste"
          onCreateClick={() => setShowCreate(true)}
        />
      </PageHeader>

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
            className="px-3.5 py-1.5 rounded-xl border border-border text-body bg-card hover:bg-muted/50 focus:ring-2 focus:ring-primary focus:outline-none font-semibold transition-all shadow-soft"
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
      {sortedLists.length === 0 ? (
        <EmptyState
          icon="shopping_cart"
          title="Noch keine Einkaufslisten"
          description={
            q
              ? 'Keine Einkaufslisten für diese Suche gefunden.'
              : 'Du hast noch keine Einkaufslisten. Erstelle eine neue Liste oder exportiere eine aus einem Rezept.'
          }
          ctaLabel="Neue Liste erstellen"
          onCtaClick={() => setShowCreate(true)}
        />
      ) : (
        <div className="stagger grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sortedLists.map((list) => (
            <ShoppingListCard
              key={list.id}
              list={list}
              onDelete={setDeleteTarget}
              onCreateNew={createNewFromPlan}
              creatingNew={creatingFromListId === list.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(newPage) => patch({ page: newPage })}
      />
    </div>
  );
}
