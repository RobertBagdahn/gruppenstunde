/**
 * ShoppingListDetailPage — Detail view with items grouped by retail section,
 * checkboxes, progress bar, collaborator management, and real-time updates.
 */
import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useShoppingList,
  useUpdateShoppingListItem,
  useAddShoppingListItem,
  useDeleteShoppingList,
  useUpdateShoppingList,
} from '@/api/shoppingLists';
import { useCurrentUser } from '@/api/auth';
import type { ShoppingListItem } from '@/schemas/shoppingList';
import { SOURCE_TYPE_LABELS } from '@/schemas/shoppingList';
import ShoppingListItemRow from '@/components/shopping/ShoppingListItemRow';
import ShoppingListProgress from '@/components/shopping/ShoppingListProgress';
import CollaboratorManager from '@/components/shopping/CollaboratorManager';
import {
  useShoppingListWebSocket,
  useOptimisticCheckItem,
} from '@/hooks/useShoppingListWebSocket';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorDisplay from '@/components/ErrorDisplay';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ShoppingListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const listId = parseInt(id ?? '0', 10);
  const navigate = useNavigate();

  const { data: user } = useCurrentUser();
  const { data: list, isLoading, error, refetch } = useShoppingList(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const addItem = useAddShoppingListItem(listId);
  const deleteList = useDeleteShoppingList();
  const updateList = useUpdateShoppingList(listId);

  const { optimisticCheck, rollback } = useOptimisticCheckItem(listId);

  // Track recent checkers for real-time indicator
  const [recentCheckers, setRecentCheckers] = useState<Record<number, string>>({});

  const handleWsEvent = useCallback(
    (event: { type: string; data: Record<string, unknown>; sender: string }) => {
      if (
        (event.type === 'item.checked' || event.type === 'item.unchecked') &&
        event.sender &&
        user?.email !== event.sender
      ) {
        const itemId = event.data.item_id as number;
        if (itemId) {
          setRecentCheckers((prev) => ({ ...prev, [itemId]: event.sender }));
          setTimeout(
            () =>
              setRecentCheckers((prev) => {
                const next = { ...prev };
                delete next[itemId];
                return next;
              }),
            3000,
          );
        }
      }
    },
    [user?.email],
  );

  const { isConnected, sendEvent } = useShoppingListWebSocket(listId, {
    onEvent: handleWsEvent,
  });

  // Add item form state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded" />
          <div className="space-y-2 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorDisplay
          error={error}
          title="Einkaufsliste nicht gefunden"
          onRetry={() => refetch()}
          onBack={() => navigate('/shopping-lists')}
          backLabel="Zurueck"
        />
      </div>
    );
  }

  const isOwner = user?.id === list.owner_id;
  const canEdit = list.can_edit ?? false;

  // Group items by retail section
  const items = list.items ?? [];
  const collabs = list.collaborators ?? [];
  const groupedItems = groupBySection(items);
  const checkedCount = items.filter((i) => i.is_checked).length;
  const totalCount = items.length;

  const handleCheck = (itemId: number, isChecked: boolean) => {
    const previousData = optimisticCheck(itemId, isChecked, user?.email ?? '');

    updateItem.mutate(
      { itemId, is_checked: isChecked },
      {
        onSuccess: () => {
          sendEvent(isChecked ? 'item.checked' : 'item.unchecked', {
            item_id: itemId,
          });
        },
        onError: (err) => {
          rollback(previousData);
          toast.error('Fehler beim Abhaken', { description: err.message });
        },
      },
    );
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    addItem.mutate(
      { name: newItemName.trim() },
      {
        onSuccess: () => {
          setNewItemName('');
          setShowAddItem(false);
          sendEvent('item.added', { name: newItemName.trim() });
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleSaveName = () => {
    if (!editName.trim()) return;
    updateList.mutate(
      { name: editName.trim() },
      {
        onSuccess: () => {
          setEditingName(false);
          sendEvent('list.updated', { name: editName.trim() });
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteList.mutate(listId, {
            onSuccess: () => {
              toast.success('Einkaufsliste geloescht');
              navigate('/shopping-lists');
            },
            onError: (err) => {
              toast.error('Fehler', { description: err.message });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Einkaufsliste loeschen?"
        description="Alle Eintraege werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deleteList.isPending}
      />

      {/* Back link */}
      <Link
        to="/shopping-lists"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Alle Listen
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-lg font-bold border rounded-lg bg-background"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg"
            >
              OK
            </button>
          </div>
        ) : (
          <h1
            className={cn(
              'text-2xl font-bold',
              isOwner && 'cursor-pointer hover:text-primary transition-colors',
            )}
            onClick={() => {
              if (isOwner) {
                setEditName(list.name);
                setEditingName(true);
              }
            }}
            title={isOwner ? 'Klicken zum Bearbeiten' : undefined}
          >
            {list.name}
          </h1>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {/* Connection indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-emerald-500' : 'bg-muted-foreground/30',
            )}
            title={isConnected ? 'Verbunden' : 'Nicht verbunden'}
          />
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Source info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
        <span>
          {SOURCE_TYPE_LABELS[list.source_type] ?? list.source_type}
        </span>
        <span>von {list.owner_username}</span>
      </div>

      {/* Progress */}
      <ShoppingListProgress checked={checkedCount} total={totalCount} className="mb-6" />

      {/* Items grouped by section */}
      {totalCount === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2 block">
            shopping_bag
          </span>
          <p className="text-muted-foreground text-sm">
            Diese Liste ist noch leer. Fuege Eintraege hinzu.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section}>
              {section && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    store
                  </span>
                  {section}
                </h3>
              )}
              <div className="divide-y">
                {items.map((item) => (
                  <ShoppingListItemRow
                    key={item.id}
                    item={item}
                    canEdit={canEdit}
                    onCheck={handleCheck}
                    recentChecker={recentCheckers[item.id]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add item */}
      {canEdit && (
        <div className="mt-4">
          {showAddItem ? (
            <div className="flex gap-2 p-3 bg-card rounded-xl border">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Neuer Eintrag..."
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={addItem.isPending || !newItemName.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Hinzufuegen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddItem(false);
                  setNewItemName('');
                }}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Eintrag hinzufuegen
            </button>
          )}
        </div>
      )}

      {/* Collaborators section */}
      <section className="mt-8 bg-card rounded-xl border p-5">
        <button
          type="button"
          onClick={() => setShowCollaborators(!showCollaborators)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="material-symbols-outlined text-[18px]">group</span>
            Mitglieder ({collabs.length})
          </h2>
          <span
            className={cn(
              'material-symbols-outlined text-muted-foreground transition-transform duration-200',
              showCollaborators && 'rotate-180',
            )}
          >
            expand_more
          </span>
        </button>
        {showCollaborators && (
          <div className="mt-4">
            <CollaboratorManager
              listId={listId}
              collaborators={collabs}
              isOwner={isOwner}
            />
          </div>
        )}
      </section>
    </div>
  );
}

// --- Helpers ---

function groupBySection(
  items: ShoppingListItem[],
): Record<string, ShoppingListItem[]> {
  const groups: Record<string, ShoppingListItem[]> = {};

  // Sort unchecked items first, then by section, then sort_order
  const sorted = [...items].sort((a, b) => {
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
    const sectionA = a.retail_section_name || '';
    const sectionB = b.retail_section_name || '';
    if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
    return a.sort_order - b.sort_order;
  });

  for (const item of sorted) {
    const section = item.retail_section_name || '';
    if (!groups[section]) groups[section] = [];
    groups[section].push(item);
  }

  return groups;
}
