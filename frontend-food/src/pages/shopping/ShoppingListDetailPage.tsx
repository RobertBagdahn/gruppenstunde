/**
 * ShoppingListDetailPage — Detail view with items grouped by retail section,
 * checkboxes, progress bar, collaborator management, and real-time updates.
 */
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
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
import KitchenReminderSection from '@/components/shopping/KitchenReminderSection';
import ReweExportButton from '@/components/shopping/ReweExportButton';
import {
  useShoppingListWebSocket,
  useOptimisticCheckItem,
} from '@/hooks/useShoppingListWebSocket';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorDisplay from '@/components/ErrorDisplay';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Trash2, Plus, Users, ChevronDown, Store, ShoppingBag, ShoppingCart } from 'lucide-react';

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
          <div className="h-8 bg-muted rounded-xl w-2/3" />
          <div className="h-6 bg-muted rounded-xl w-1/3" />
          <div className="h-3 bg-muted rounded-xl" />
          <div className="space-y-2 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-xl" />
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
          backLabel="Zurück"
        />
      </div>
    );
  }

  const isOwner = list.is_owner ?? (user?.id === list.owner_id);
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
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans">
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteList.mutate(listId, {
            onSuccess: () => {
              toast.success('Einkaufsliste gelöscht');
              navigate('/shopping-lists');
            },
            onError: (err) => {
              toast.error('Fehler', { description: err.message });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Einkaufsliste löschen?"
        description="Alle Einträge werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteList.isPending}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <BackButton to="/shopping-lists" />
        <div className="border-l border-border pl-3 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3.5 py-1.5 text-lg font-bold border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="px-4 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-soft shrink-0"
                >
                  OK
                </button>
              </div>
            ) : (
              <h1
                className={cn(
                  'text-2xl font-display font-bold text-foreground',
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

            <div className="flex items-center gap-3.5 shrink-0">
              {/* Connection indicator */}
              <div
                className={cn(
                  'w-2 h-2 rounded-full ring-4 shrink-0 transition-all',
                  isConnected ? 'bg-primary ring-primary/20' : 'bg-muted-foreground/30 ring-muted/10',
                )}
                title={isConnected ? 'Verbunden' : 'Nicht verbunden'}
              />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center p-2 text-destructive border border-destructive/20 bg-card rounded-xl hover:bg-destructive/10 hover:border-destructive/30 transition-all shadow-soft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Source info */}
      <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground mb-4 pl-8">
        <span>
          {SOURCE_TYPE_LABELS[list.source_type] ?? list.source_type}
        </span>
        <span className="text-border/85">•</span>
        <span>von {list.owner_username}</span>
      </div>

      {/* Progress */}
      <ShoppingListProgress checked={checkedCount} total={totalCount} className="mb-6" />

      {/* Total price */}
      {items.some((i) => i.estimated_price_eur !== null && i.estimated_price_eur !== undefined) && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 shadow-soft mb-6">
          <span className="text-sm font-semibold text-muted-foreground">
            Geschätzter Gesamtpreis
          </span>
          <span className="text-lg font-bold text-foreground">
            {items
              .reduce((sum, i) => sum + (i.estimated_price_eur ?? 0), 0)
              .toFixed(2)}{' '}
            €
          </span>
        </div>
      )}

      {/* Items grouped by section */}
      {totalCount === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl shadow-soft">
          <ShoppingBag className="w-10 h-10 text-muted-foreground/80 mb-2.5 mx-auto" />
          <p className="text-muted-foreground text-sm font-semibold">
            Diese Liste ist noch leer. Füge Einträge hinzu.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-soft">
              {section && (
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Store className="w-4 h-4 text-primary shrink-0" />
                  {section}
                </h3>
              )}
              <div className="divide-y divide-border/40 space-y-1">
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
            <div className="flex gap-2 p-3 bg-card rounded-xl border border-border shadow-soft">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Neuer Eintrag..."
                className="flex-1 px-3.5 py-2 text-sm border border-border bg-background rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={addItem.isPending || !newItemName.trim()}
                className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
              >
                Hinzufügen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddItem(false);
                  setNewItemName('');
                }}
                className="px-4 py-2 text-sm font-semibold border border-border bg-card rounded-xl hover:bg-muted transition-all shadow-soft"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddItem(true)}
              className="inline-flex items-center gap-1.5 text-sm text-primary font-bold hover:underline py-2"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              Eintrag hinzufügen
            </button>
          )}
        </div>
      )}

      {/* REWE Export */}
      <section className="mt-6 bg-card rounded-xl border border-border p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
          <ShoppingCart className="w-4 h-4 text-primary shrink-0" />
          REWE-Export
        </h2>
        <ReweExportButton listId={listId} listName={list.name} items={items} />
      </section>

      {/* Kitchen Reminder Section */}
      <KitchenReminderSection />

      {/* Collaborators section */}
      <section className="mt-8 bg-card rounded-xl border border-border p-5 shadow-soft">
        <button
          type="button"
          onClick={() => setShowCollaborators(!showCollaborators)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Users className="w-4 h-4 text-primary shrink-0" />
            Mitglieder ({collabs.length})
          </h2>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              showCollaborators && 'rotate-180',
            )}
          />
        </button>
        {showCollaborators && (
          <div className="mt-4 border-t border-border/40 pt-4">
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
