/**
 * ShoppingListPage — List view of all shopping lists (own + shared).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useShoppingLists,
  useCreateShoppingList,
  useDeleteShoppingList,
} from '@/api/shoppingLists';
import { useCurrentUser } from '@/api/auth';
import { SOURCE_TYPE_LABELS } from '@/schemas/shoppingList';
import type { ShoppingList } from '@/schemas/shoppingList';
import ShoppingListProgress from '@/components/shopping/ShoppingListProgress';
import Pagination from '@/components/shared/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import ListPageHero from '@/components/shared/ListPageHero';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import EmptyState from '@/components/shared/EmptyState';
import UnauthGate from '@/components/shared/UnauthGate';
import { toast } from 'sonner';

function ShoppingListCard({ list }: { list: ShoppingList }) {
  const sourceLabel = SOURCE_TYPE_LABELS[list.source_type] ?? list.source_type;
  const updatedAt = new Date(list.updated_at);
  const timeAgo = getTimeAgo(updatedAt);

  return (
    <Link
      to={`/shopping-lists/${list.id}`}
      className="group block rounded-2xl border border-border/50 bg-card p-4 hover:border-teal-500/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate group-hover:text-teal-700 transition-colors">
            {list.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                {list.source_type === 'recipe'
                  ? 'restaurant'
                  : list.source_type === 'meal_event'
                    ? 'calendar_today'
                    : 'edit_note'}
              </span>
              {sourceLabel}
            </span>
            <span>{timeAgo}</span>
            {list.collaborators_count > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">group</span>
                {list.collaborators_count}
              </span>
            )}
          </div>
        </div>
        {list.items_count === list.checked_count && list.items_count > 0 && (
          <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">
            check_circle
          </span>
        )}
      </div>

      <ShoppingListProgress
        checked={list.checked_count}
        total={list.items_count}
        className="mt-3"
      />
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

export default function ShoppingListPage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useShoppingLists(page, 20);
  const createList = useCreateShoppingList();
  const deleteList = useDeleteShoppingList();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('newest');

  if (userLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-16 bg-muted rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-2xl" />
            ))}
          </div>
        </div>
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

  // Client-side search filtering
  const filteredLists = searchInput.trim()
    ? lists.filter((l) => l.name.toLowerCase().includes(searchInput.toLowerCase()))
    : lists;

  // Client-side sorting
  const sortedLists = [...filteredLists].sort((a, b) => {
    if (sort === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    if (sort === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    if (sort === 'name_asc') return a.name.localeCompare(b.name);
    return 0;
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createList.mutate(
      { name: newName.trim() },
      {
        onSuccess: (created) => {
          toast.success('Einkaufsliste erstellt');
          setNewName('');
          setShowCreate(false);
          navigate(`/shopping-lists/${created.id}`);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <ConfirmDialog
        open={deleteTargetId !== null}
        onConfirm={() => {
          if (deleteTargetId !== null) {
            deleteList.mutate(deleteTargetId, {
              onSuccess: () => {
                toast.success('Einkaufsliste geloescht');
                setDeleteTargetId(null);
              },
              onError: (err) => {
                toast.error('Fehler', { description: err.message });
                setDeleteTargetId(null);
              },
            });
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
        title="Einkaufsliste loeschen?"
        description="Die Einkaufsliste und alle Eintraege werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deleteList.isPending}
      />

      {/* Hero */}
      <ListPageHero
        title="Einkaufslisten"
        description="Erstelle und verwalte deine Einkaufslisten."
        icon="shopping_cart"
        gradientClasses="bg-gradient-to-br from-teal-500 to-cyan-600"
        totalCount={data?.total}
        countLabel="Liste"
        countIcon="shopping_cart"
      />

      {/* Search Bar */}
      <ListPageSearchBar
        placeholder="Einkaufsliste suchen..."
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={() => {}}
        createLabel="Neue Liste"
        onCreateClick={() => setShowCreate(true)}
        gradientClasses="from-teal-500/5 via-cyan-500/5 to-teal-500/5"
      />

      {/* Sort */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2 bg-gradient-to-r from-teal-500/5 to-transparent px-4 py-2 rounded-lg">
          <span className="material-symbols-outlined text-teal-600 text-[18px]">sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-card focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
          >
            <option value="newest">Neueste</option>
            <option value="oldest">Aelteste</option>
            <option value="name_asc">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 p-4 bg-card rounded-xl border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name der Einkaufsliste"
              className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={createList.isPending || !newName.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewName('');
              }}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {sortedLists.length === 0 ? (
        <EmptyState
          icon="shopping_cart"
          title="Noch keine Einkaufslisten"
          description={
            searchInput
              ? 'Keine Einkaufslisten fuer diese Suche gefunden.'
              : 'Du hast noch keine Einkaufslisten. Erstelle eine neue Liste oder exportiere eine aus einem Rezept.'
          }
          ctaLabel="Neue Liste erstellen"
          onCtaClick={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sortedLists.map((list) => (
            <ShoppingListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
