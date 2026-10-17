/**
 * ShoppingListDetailPage — Detail view with items grouped by retail section,
 * checkboxes, progress bar, collaborator management, and real-time updates.
 */
import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
import HeroBand from '@/components/shared/HeroBand';
import { QuantityWarningsBanner } from '@/components/shared/QuantityWarningsBanner';
import {
  useShoppingList,
  useShoppingListBoard,
  useShoppingListWarnings,
  useUpdateShoppingListItem,
  useAddShoppingListItem,
  useDeleteShoppingListItem,
  useDeleteShoppingList,
  useUpdateShoppingList,
  useCreateFromMealPlan,
  useShoppingListSync,
} from '@/api/shoppingLists';
import { useCurrentUser } from '@/api/auth';
import type { ShoppingListItem } from '@/schemas/shoppingList';
import { SOURCE_TYPE_LABELS } from '@/schemas/shoppingList';
import ShoppingListItemRow from '@/components/shopping/ShoppingListItemRow';
import ShoppingBoardView from '@/components/shopping/ShoppingBoardView';
import ShoppingListProgress from '@/components/shopping/ShoppingListProgress';
import SourceFreshnessNotice from '@/components/shopping/SourceFreshnessNotice';
import ShareLinkManager from '@/components/shopping/ShareLinkManager';
import CollaboratorManager from '@/components/shopping/CollaboratorManager';
import KitchenReminderSection from '@/components/shopping/KitchenReminderSection';
import ReweExportButton from '@/components/shopping/ReweExportButton';
import {
  useShoppingListWebSocket,
  useOptimisticCheckItem,
  type ShoppingListEvent,
} from '@/hooks/useShoppingListWebSocket';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorDisplay from '@/components/ErrorDisplay';
import UnauthGate from '@/components/shared/UnauthGate';
import { ApiError } from '@/lib/api';
import { isOverloadError } from '@/lib/queryRetry';
import OverloadNotice from '@/components/shopping/OverloadNotice';
import { notify, UNDO_DURATION_MS } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { clearGuestCredentials, getGuestCredentials } from '@/lib/shoppingGuest';
import { Trash2, Plus, Users, Share2, UserRound, ShoppingBasket, ChevronDown, Store, ShoppingBag, ShoppingCart, ClipboardList, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { formatEuro } from '@/lib/format';
import { PageSkeleton } from '@/components/ui/skeleton';

export default function ShoppingListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const listId = parseInt(id ?? '0', 10);
  // Shopping mode: only the entries, in big tap targets (remembered per device).
  const [shopMode, setShopModeState] = useState(() => {
    try {
      return window.localStorage.getItem('inspi.shopping.shopMode') === '1';
    } catch {
      return false;
    }
  });
  const setShopMode = (on: boolean) => {
    setShopModeState(on);
    try {
      window.localStorage.setItem('inspi.shopping.shopMode', on ? '1' : '0');
    } catch {
      // Not remembered in private mode.
    }
  };
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as { mealPlanId?: number } | null;

  const { data: user, isLoading: userLoading } = useCurrentUser();
  // A device that joined through an invitation link has no account but a guest identity.
  const guestCredentials = getGuestCredentials(listId);
  // Shopping mode runs on the compact board only; the full list is not loaded there.
  const { data: list, isLoading, error, refetch } = useShoppingList(listId, !shopMode);
  const {
    data: board,
    isLoading: boardLoading,
    error: boardError,
    refetch: refetchBoard,
  } = useShoppingListBoard(listId, shopMode);
  const updateItem = useUpdateShoppingListItem(listId);
  const addItem = useAddShoppingListItem(listId);
  const deleteItem = useDeleteShoppingListItem(listId);
  const deleteList = useDeleteShoppingList();
  const updateList = useUpdateShoppingList(listId);
  const createFromMealPlan = useCreateFromMealPlan();

  const { optimisticCheck, rollback } = useOptimisticCheckItem(listId);

  // Track recent checkers for real-time indicator
  const [recentCheckers, setRecentCheckers] = useState<Record<number, string>>({});

  const viewerName = list?.viewer_display_name || user?.display_name || '';
  const handleWsEvent = useCallback(
    (event: ShoppingListEvent) => {
      // Own actions come back through the socket too; guests have no user id, so their name decides.
      const isOwnEvent = event.sender_id != null ? event.sender_id === user?.id : event.sender === viewerName;
      if ((event.type === 'item.checked' || event.type === 'item.unchecked') && event.sender && !isOwnEvent) {
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
    [user?.id, viewerName],
  );

  const { isConnected, sendEvent } = useShoppingListWebSocket(listId, {
    onEvent: handleWsEvent,
  });
  // Production serves no WebSocket: a polled change marker keeps the list current (slower while the socket is up).
  const { pulseOverloaded } = useShoppingListSync(listId, shopMode ? board?.stamp : list?.stamp, isConnected);

  // Add item form state
  const [allSourcesOpen, setAllSourcesOpen] = useState(false);
  const [sourcesSignal, setSourcesSignal] = useState<{ open: boolean } | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showShare, setShowShare] = useState(false);
  // Plausibility warnings come from their own endpoint and are not needed in shopping mode.
  const { data: warnings = [] } = useShoppingListWarnings(listId, !shopMode);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  // The guest's stored secret stopped working (link renewed or guest removed): tell them once, then forget it.
  const [guestAccessEnded, setGuestAccessEnded] = useState(false);
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404 && getGuestCredentials(listId)) {
      clearGuestCredentials(listId);
      setGuestAccessEnded(true);
    }
  }, [error, listId]);

  if (guestAccessEnded) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorDisplay
          error={error}
          title="Dein Zugang zur Einkaufsliste wurde beendet"
          description="Der Einladungslink wurde erneuert oder du wurdest entfernt. Frag nach einem neuen Link."
          onBack={() => navigate('/shopping-lists')}
          backLabel="Zu meinen Einkaufslisten"
        />
      </div>
    );
  }

  // Anonymous visitors (or an expired session) get a login hint instead of an error.
  if ((!userLoading && !user && !guestCredentials) || (error instanceof ApiError && error.status === 401)) {
    return (
      <UnauthGate
        title="Einkaufsliste"
        description="Melde dich an, um diese Einkaufsliste zu sehen."
      />
    );
  }

  const handleCheck = (itemId: number, isChecked: boolean) => {
    const previousData = optimisticCheck(itemId, isChecked);

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
          notify.error('Eintrag konnte nicht abgehakt werden', { error: err });
        },
      },
    );
  };

  // Shopping mode: the compact board, no full list needed.
  if (shopMode) {
    const handleBoardClaim = (itemId: number, claimed: boolean) =>
      updateItem.mutate(
        { itemId, claimed },
        { onError: (err) => notify.error('Zuständigkeit konnte nicht geändert werden', { error: err }) },
      );
    const handleBoardDelete = (itemId: number) =>
      deleteItem.mutate(itemId, {
        onSuccess: () => sendEvent('item.removed', { item_id: itemId }),
        onError: (err) => notify.error('Eintrag konnte nicht gelöscht werden', { error: err }),
      });
    return (
      <ShoppingBoardView
        board={board}
        isLoading={boardLoading}
        error={boardError}
        overloaded={pulseOverloaded}
        onRetry={() => void refetchBoard()}
        onExit={() => setShopMode(false)}
        onCheck={handleCheck}
        onClaim={handleBoardClaim}
        onDelete={handleBoardDelete}
      />
    );
  }

  if (isLoading) {
    return (
      <PageSkeleton label="Einkaufsliste wird geladen" />
    );
  }

  // Overload with a list on screen keeps the list and shows a notice; any other error replaces it.
  if ((error && !isOverloadError(error)) || !list) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorDisplay
          error={error}
          title={isNotFound ? 'Einkaufsliste nicht gefunden' : undefined}
          onRetry={() => refetch()}
          onBack={() => navigate('/shopping-lists')}
          backLabel="Zurück"
        />
      </div>
    );
  }

  const isGuest = list.viewer_guest_id !== null;
  const isOwner = !isGuest && (list.is_owner ?? (user?.id === list.owner_id));
  const canEdit = list.can_edit ?? false;

  // Group items by retail section
  const items = list.items ?? [];
  const collabs = list.collaborators ?? [];
  const isAdmin = isOwner || collabs.some((collab) => collab.user_id === user?.id && collab.role === 'admin');
  const canRename = isOwner || isAdmin;
  const groupedItems = groupBySection(items);
  const checkedCount = items.filter((i) => i.is_checked).length;
  const totalCount = items.length;

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
        onError: (err) => notify.error('Eintrag konnte nicht hinzugefügt werden', { error: err }),
      },
    );
  };

  const handleDeleteItem = (item: ShoppingListItem) => {
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        sendEvent('item.removed', { item_id: item.id });
        notify.success(`„${item.name}“ gelöscht`, {
          duration: UNDO_DURATION_MS,
          action: {
            label: 'Rückgängig',
            onClick: () =>
              addItem.mutate(
                {
                  name: item.name,
                  quantity_g: item.quantity_g,
                  unit: item.unit,
                  note: item.note,
                  retail_section_id: item.retail_section_id ?? null,
                  ingredient_id: item.ingredient_id ?? null,
                  sort_order: item.sort_order,
                  is_checked: item.is_checked,
                },
                {
                  onSuccess: () => sendEvent('item.added', { name: item.name }),
                  onError: (err) => notify.error('Eintrag konnte nicht wiederhergestellt werden', { error: err }),
                },
              ),
          },
        });
      },
      onError: (err) => notify.error('Eintrag konnte nicht gelöscht werden', { error: err }),
    });
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
        onError: (err) => notify.error('Einkaufsliste konnte nicht gespeichert werden', { error: err }),
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans">
      {(pulseOverloaded || isOverloadError(error)) && (
        <div className="mb-4">
          <OverloadNotice />
        </div>
      )}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteList.mutate(listId, {
            onSuccess: () => {
              notify.success('Einkaufsliste gelöscht');
              navigate('/shopping-lists');
            },
            onError: (err) => {
              notify.error('Einkaufsliste konnte nicht gelöscht werden', { error: err });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title={list ? `Einkaufsliste „${list.name}“ löschen?` : 'Einkaufsliste löschen?'}
        description="Alle Einträge werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteList.isPending}
      />

      {/* Header on the hero band */}
      <HeroBand pullUpClassName="-mt-8" innerClassName="max-w-2xl" className="mb-6">
      <BackButton to="/shopping-lists" tone="hero" className="mb-5" />
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  data-testid="shopping-list-name-input"
                  className="flex-1 h-14 px-4 font-display text-title font-extrabold text-foreground rounded-xl bg-card focus:outline-none focus:ring-4 focus:ring-ring/50 transition-all shadow-raised"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="press h-14 px-5 text-body font-bold bg-hero-foreground text-foreground rounded-xl hover:bg-hero-muted transition-colors shrink-0"
                >
                  OK
                </button>
              </div>
            ) : (
              <h1
                className={cn(
                  'font-display text-display font-extrabold text-hero-foreground [overflow-wrap:anywhere]',
                  canRename && 'cursor-pointer decoration-hero-muted/60 underline-offset-8 hover:underline',
                )}
                onClick={() => {
                  if (canRename) {
                    setEditName(list.name);
                    setEditingName(true);
                  }
                }}
                title={canRename ? 'Klicken zum Bearbeiten' : undefined}
              >
                {list.name}
              </h1>
            )}

            <div className="flex items-center gap-3.5 shrink-0">
              {/* Connection indicator */}
              <div
                className={cn(
                  'w-2 h-2 rounded-full ring-4 shrink-0 transition-all',
                  isConnected ? 'bg-success-bright ring-success-bright/25 animate-pulse' : 'bg-hero-muted/40 ring-hero-soft',
                )}
                title={isConnected ? 'Verbunden' : 'Nicht verbunden'}
              />
              <button
                type="button"
                onClick={() => setShopMode(!shopMode)}
                aria-label={shopMode ? 'Einkaufsmodus beenden' : 'Einkaufsmodus starten'}
                aria-pressed={shopMode}
                data-testid="shopping-shop-mode-toggle"
                className={cn(
                  'press flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
                  shopMode ? 'bg-hero-foreground text-foreground' : 'bg-hero-soft text-hero-foreground hover:bg-hero-muted/30',
                )}
              >
                <ShoppingBasket className="w-4 h-4" />
              </button>
              {list.can_manage && !shopMode && (
                <button
                  type="button"
                  onClick={() => setShowShare((open) => !open)}
                  aria-label="Einkaufsliste teilen"
                  aria-expanded={showShare}
                  data-testid="shopping-share-toggle"
                  className="press flex h-11 w-11 items-center justify-center rounded-lg bg-hero-soft text-hero-foreground transition-colors hover:bg-hero-muted/30"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
              {isOwner && !shopMode && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  aria-label="Einkaufsliste löschen"
                  className="press flex h-11 w-11 items-center justify-center rounded-lg bg-hero-soft text-danger-border transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Source info */}
      <div className="flex items-center gap-3 text-body text-hero-muted">
        <span>
          {SOURCE_TYPE_LABELS[list.source_type] ?? list.source_type}
        </span>
        <span aria-hidden="true">•</span>
        <span>von <span className="font-semibold text-hero-foreground">{list.owner_display_name}</span></span>
      </div>
      </HeroBand>

      {isGuest && !shopMode && (
        <div
          className="mb-6 flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-body text-primary"
          data-testid="shopping-guest-banner"
        >
          <UserRound className="h-4 w-4 shrink-0" />
          <span>
            Du bist als <strong>{list.viewer_display_name}</strong> dabei. Alle sehen, was du einträgst und abhakst.
          </span>
        </div>
      )}

      {list.can_manage && !shopMode && (showShare || list.share_token) && (
        <ShareLinkManager listId={listId} listName={list.name} shareToken={list.share_token} guests={list.guests} />
      )}

      {!shopMode && (
      <SourceFreshnessNotice
        status={list.source_status}
        pending={createFromMealPlan.isPending}
        className="mb-6"
        onCreateNew={list.source_id ? () => createFromMealPlan.mutate(
          { mealPlanId: list.source_id as number },
          {
            onSuccess: (created) => {
              notify.success('Neue Einkaufsliste erstellt');
              navigate(`/shopping-lists/${created.id}`, { state: { mealPlanId: list.source_id } });
            },
            onError: (err) => notify.error('Einkaufsliste konnte nicht angelegt werden', { error: err }),
          },
        ) : undefined}
      />
      )}

      {/* Quantity plausibility warnings from generation */}
      {!shopMode && warnings.length > 0 && (
        <div className="mb-6">
          <QuantityWarningsBanner warnings={warnings} mealPlanId={navigationState?.mealPlanId ?? list.source_id ?? undefined} />
        </div>
      )}

      {/* Progress */}
      <ShoppingListProgress checked={checkedCount} total={totalCount} className="mb-6" />

      {/* Recipe sources of all entries at once */}
      {!shopMode && items.some((item) => item.sources && item.sources.length > 0) && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            data-testid="shopping-toggle-all-sources"
            onClick={() => {
              const open = !allSourcesOpen;
              setAllSourcesOpen(open);
              setSourcesSignal({ open });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption font-semibold text-primary hover:bg-primary-soft"
          >
            {allSourcesOpen ? <ChevronsDownUp className="w-4 h-4" /> : <ChevronsUpDown className="w-4 h-4" />}
            {allSourcesOpen ? 'Alle Rezepte ausblenden' : 'Alle Rezepte anzeigen'}
          </button>
        </div>
      )}

      {/* Material list (devices and consumables of the source recipes) */}
      {!isGuest && !shopMode && (list.source_type === 'recipe' || list.source_type === 'meal_event') && (
        <Link
          to={`/material-list?shopping-list=${list.id}`}
          data-testid="shopping-material-list-link"
          className="press mb-6 flex items-center justify-center gap-2 rounded-lg bg-primary-soft px-4 py-2.5 text-body font-medium text-primary transition-colors hover:bg-primary-soft/80"
        >
          <ClipboardList className="w-4 h-4" />
          Materialliste anzeigen
        </Link>
      )}

      {/* Total price */}
      {!shopMode && items.some((i) => i.estimated_price_eur !== null && i.estimated_price_eur !== undefined) && (
        <div className="flex items-center justify-between bg-card rounded-xl px-4 py-3 mb-6 shadow-card">
          <span className="text-body font-semibold text-muted-foreground">
            Geschätzter Gesamtpreis
          </span>
          <span className="text-section font-bold text-foreground">
            {formatEuro(items.reduce((sum, i) => sum + (i.estimated_price_eur ?? 0), 0))}
          </span>
        </div>
      )}

      {/* Items grouped by section */}
      {totalCount === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl shadow-card">
          <ShoppingBag className="w-10 h-10 text-muted-foreground/80 mb-2.5 mx-auto" />
          <p className="text-muted-foreground text-body font-semibold">
            Diese Liste ist noch leer. Füge Einträge hinzu.
          </p>
        </div>
      ) : (
        <div className="stagger space-y-6">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="bg-card rounded-xl p-4 md:p-5 shadow-card">
              {section && (
                <h3 className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-border/40 pb-2">
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
                    onDelete={handleDeleteItem}
                    onUpdateQuantity={(itemId, quantityG) =>
                      updateItem.mutate(
                        { itemId, quantity_g: quantityG },
                        { onError: (err) => notify.error('Menge konnte nicht geändert werden', { error: err }) },
                      )
                    }
                    recentChecker={recentCheckers[item.id]}
                    sourcesSignal={sourcesSignal}
                    shopMode={shopMode}
                    onClaim={(itemId, claimed) =>
                      updateItem.mutate(
                        { itemId, claimed },
                        { onError: (err) => notify.error('Zuständigkeit konnte nicht geändert werden', { error: err }) },
                      )
                    }
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
            <div className="flex gap-2 p-3 bg-card rounded-xl shadow-card">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Neuer Eintrag..."
                className="flex-1 px-3.5 py-2 text-body border border-border bg-background rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={addItem.isPending || !newItemName.trim()}
                className="px-4 py-2 text-body font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
              >
                Hinzufügen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddItem(false);
                  setNewItemName('');
                }}
                className="px-4 py-2 text-body font-semibold border border-border bg-card rounded-xl hover:bg-muted transition-all shadow-soft"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddItem(true)}
              className="inline-flex items-center gap-1.5 text-body text-primary font-bold hover:underline py-2"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              Eintrag hinzufügen
            </button>
          )}
        </div>
      )}

      {/* REWE Export */}
      {!isGuest && !shopMode && (
        <section className="mt-6 bg-card rounded-xl p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-caption font-bold text-muted-foreground uppercase tracking-wider mb-4">
            <ShoppingCart className="w-4 h-4 text-primary shrink-0" />
            REWE-Export
          </h2>
          <ReweExportButton listId={listId} listName={list.name} items={items} />
        </section>
      )}

      {/* Kitchen Reminder Section */}
      {!isGuest && !shopMode && <KitchenReminderSection />}

      {/* Collaborators section */}
      {!isGuest && !shopMode && (
      <section className="mt-8 bg-card rounded-xl p-5 shadow-card">
        <button
          type="button"
          onClick={() => setShowCollaborators(!showCollaborators)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="flex items-center gap-2 text-caption font-bold text-muted-foreground uppercase tracking-wider">
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
              canManage={isAdmin}
            />
          </div>
        )}
      </section>
      )}
    </div>
  );
}

// --- Helpers ---

/** Heading of entries without retail section (free text); listed after all retail sections. */
const OTHER_SECTION = 'Sonstiges';

/** Heading of consumable materials (paper plates, skewers ...); always listed last. */
export const MATERIAL_SECTION = 'Verbrauchsmaterial';

function sectionOf(item: ShoppingListItem): string {
  return item.is_material ? MATERIAL_SECTION : item.retail_section_name || OTHER_SECTION;
}

export function groupBySection(
  items: ShoppingListItem[],
): Record<string, ShoppingListItem[]> {
  const groups: Record<string, ShoppingListItem[]> = {};

  // Preserve the server's retail-section order and sort only within sections.
  const sorted = [...items].sort((a, b) => {
    if (sectionOf(a) !== sectionOf(b)) return 0;
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
    return a.sort_order - b.sort_order;
  });

  for (const item of sorted) {
    const section = sectionOf(item);
    if (!groups[section]) groups[section] = [];
    groups[section].push(item);
  }

  // Free-text entries have no section and would otherwise come first, headless;
  // consumable materials form the final block.
  const { [OTHER_SECTION]: other, [MATERIAL_SECTION]: materials, ...sections } = groups;
  return {
    ...sections,
    ...(other ? { [OTHER_SECTION]: other } : {}),
    ...(materials ? { [MATERIAL_SECTION]: materials } : {}),
  };
}
