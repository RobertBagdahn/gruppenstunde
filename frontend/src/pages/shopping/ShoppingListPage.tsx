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
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';

function ShoppingListCard({ list }: { list: ShoppingList }) {
  const sourceLabel = SOURCE_TYPE_LABELS[list.source_type] ?? list.source_type;
  const updatedAt = new Date(list.updated_at);
  const timeAgo = getTimeAgo(updatedAt);

  return (
    <Link
      to={`/shopping-lists/${list.id}`}
      className="block rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{list.name}</h3>
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

  if (userLoading || isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <span className="material-symbols-outlined text-6xl text-muted-foreground mb-4 block">
          shopping_cart
        </span>
        <h1 className="text-2xl font-bold mb-2">Einkaufslisten</h1>
        <p className="text-muted-foreground mb-6">
          Melde dich an, um Einkaufslisten zu erstellen und mit anderen zu teilen.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Anmelden
        </Link>
      </div>
    );
  }

  const lists = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;

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
    <div className="max-w-2xl mx-auto px-4 py-8">
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">shopping_cart</span>
          Einkaufslisten
        </h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Neue Liste
        </button>
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
      {lists.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
            shopping_cart
          </span>
          <p className="text-muted-foreground">
            Du hast noch keine Einkaufslisten. Erstelle eine neue Liste oder exportiere eine
            aus einem Rezept.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <ShoppingListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Zurueck
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            Seite {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
