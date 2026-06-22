/**
 * ShoppingListPage — List view of all shopping lists (own + shared).
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Utensils, Calendar, Edit3, Users, CheckCircle2, ArrowUpDown, User as UserIcon } from 'lucide-react';
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

  const SourceIcon = list.source_type === 'recipe'
    ? Utensils
    : list.source_type === 'meal_event'
      ? Calendar
      : Edit3;

  return (
    <Link
      to={`/shopping-lists/${list.id}`}
      className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 shadow-soft transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
            {list.name}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-muted-foreground">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  const page = parseInt(searchParams.get('page') ?? '1', 10) || 1;
  const q = searchParams.get('q') ?? '';

  const { data, isLoading, error } = useShoppingLists(page, 20, q);
  const createList = useCreateShoppingList();
  const deleteList = useDeleteShoppingList();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState(q);
  const [sort, setSort] = useState('newest');
  const [myDataOnly, setMyDataOnly] = useState(false);

  // Sync local input → URL param with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (searchInput) {
        newParams.set('q', searchInput);
      } else {
        newParams.delete('q');
      }
      newParams.set('page', '1');
      setSearchParams(newParams, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  if (userLoading || (isLoading && !data)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-16 bg-muted rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-xl" />
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

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-destructive text-sm">Einkaufslisten konnten nicht geladen werden.</p>
      </div>
    );
  }

  // Owner filter only (server handles search); sort is client-side within the page
  const filteredLists = myDataOnly
    ? lists.filter((l) => l.owner_id === user.id)
    : lists;

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 font-sans">
      <ConfirmDialog
        open={deleteTargetId !== null}
        onConfirm={() => {
          if (deleteTargetId !== null) {
            deleteList.mutate(deleteTargetId, {
              onSuccess: () => {
                toast.success('Einkaufsliste gelöscht');
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
        title="Einkaufsliste löschen?"
        description="Die Einkaufsliste und alle Einträge werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteList.isPending}
      />

      {/* Hero */}
      <ListPageHero
        title="Einkaufslisten"
        description="Erstelle und verwalte deine Einkaufslisten."
        icon="shopping_cart"
        gradientClasses="gradient-primary"
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
        gradientClasses=""
      />

      {/* My Data + Sort */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setMyDataOnly(!myDataOnly)}
          className={[
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all shadow-soft',
            myDataOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40',
          ].join(' ')}
        >
          <UserIcon className="w-4 h-4" />
          Meine Daten
        </button>
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent px-4 py-2 rounded-xl">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-border text-sm bg-card hover:bg-muted/50 focus:ring-2 focus:ring-primary focus:outline-none font-semibold transition-all shadow-soft"
          >
            <option value="newest">Neueste</option>
            <option value="oldest">Älteste</option>
            <option value="name_asc">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 p-5 bg-card rounded-xl border border-border shadow-soft">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name der Einkaufsliste"
              className="flex-1 px-3.5 py-2 text-sm border border-border rounded-xl bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCreate}
                disabled={createList.isPending || !newName.trim()}
                className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
              >
                Erstellen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                }}
                className="px-4 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-muted bg-card transition-all shadow-soft"
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
            searchInput
              ? 'Keine Einkaufslisten für diese Suche gefunden.'
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
        onPageChange={(newPage) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set('page', String(newPage));
          setSearchParams(newParams, { replace: true });
        }}
      />
    </div>
  );
}
