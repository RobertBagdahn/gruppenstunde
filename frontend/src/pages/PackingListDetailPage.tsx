import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
import { toast } from 'sonner';
import {
  usePackingList,
  useUpdatePackingList,
  useDeletePackingList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateItem,
  useCreateItemDynamic,
  useUpdateItem,
  useDeleteItem,
  useClonePackingList,
  useResetChecks,
  useCreateShare,
  usePackingListShares,
  useDeactivateShare,
  fetchExportText,
  useRandomSuggestions,
  useCatalogSuggestions,
  useSuggestionCategories,
  useAiSuggestItems,
  useFullCatalog,
} from '@/api/packingLists';
import { exportToPdf } from '@/lib/pdfExport';
import type { PackingList, PackingCategory, PackingItem, SuggestionItem, CatalogItem } from '@/schemas/packingList';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import AutocompleteInput from '@/components/AutocompleteInput';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

// ---------------------------------------------------------------------------
// Inline-edit helper
// ---------------------------------------------------------------------------
function InlineEdit({
  value,
  onSave,
  placeholder = '',
  className = '',
  disabled = false,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (disabled) {
    return <span className={className}>{value || placeholder}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`text-left hover:bg-muted/50 rounded px-1 -mx-1 transition ${className}`}
        title="Klicken zum Bearbeiten"
      >
        {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
  };

  return (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      }}
      placeholder={placeholder}
      className={`bg-background border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-teal-400 ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
function ProgressBar({
  checked,
  total,
  size = 'md',
}: {
  checked: number;
  total: number;
  size?: 'sm' | 'md';
}) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  const barHeight = size === 'sm' ? 'h-1' : 'h-2';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${barHeight} bg-muted rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100 ? 'bg-green-500' : 'bg-teal-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {checked}/{total}
        {pct === 100 && (
          <span className="ml-1 text-green-600">
            <span className="material-symbols-outlined text-xs align-middle">check_circle</span>
          </span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick-add input
// ---------------------------------------------------------------------------
function QuickAddItem({
  onAdd,
  isPending,
  catalogItems,
  existingItemNames,
}: {
  onAdd: (name: string, isDoNotBring?: boolean, quantity?: string, description?: string) => void;
  isPending: boolean;
  catalogItems: CatalogItem[];
  existingItemNames: string[];
}) {
  const [value, setValue] = useState('');
  const [isDoNotBring, setIsDoNotBring] = useState(false);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed, isDoNotBring);
      setValue('');
      setIsDoNotBring(false);
    }
  };

  const handleSelect = (item: CatalogItem) => {
    onAdd(item.name, false, item.quantity, item.description);
    setValue('');
    setIsDoNotBring(false);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="material-symbols-outlined text-muted-foreground text-lg">add</span>
      <AutocompleteInput
        value={value}
        onChange={setValue}
        onSelect={handleSelect}
        onSubmit={submit}
        catalogItems={catalogItems}
        existingItemNames={existingItemNames}
        placeholder="Gegenstand hinzufügen..."
        disabled={isPending}
      />
      <button
        type="button"
        onClick={() => setIsDoNotBring(!isDoNotBring)}
        className={`shrink-0 p-1 rounded transition ${
          isDoNotBring
            ? 'text-red-500 bg-red-50'
            : 'text-muted-foreground/40 hover:text-red-400'
        }`}
        title={isDoNotBring ? 'Als normalen Gegenstand markieren' : 'Als "Nicht mitbringen" markieren'}
      >
        <span className="material-symbols-outlined text-sm">block</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single item row with checkbox
// ---------------------------------------------------------------------------
function ItemRow({
  item,
  canEdit,
  packingListId,
  categoryId,
  onOpenDetail,
}: {
  item: PackingItem;
  canEdit: boolean;
  packingListId: number;
  categoryId: number;
  onOpenDetail?: (item: PackingItem) => void;
}) {
  const updateItem = useUpdateItem(packingListId, categoryId);
  const deleteItem = useDeleteItem(packingListId, categoryId);
  const isDnb = item.is_do_not_bring;

  return (
    <div
      className={`flex items-center gap-2 group py-1 ${onOpenDetail ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        // Don't open detail if clicking checkbox, delete button, or inline edit
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input')) return;
        onOpenDetail?.(item);
      }}
    >
      {/* Checkbox or prohibition icon */}
      {isDnb ? (
        <span
          className="shrink-0 w-5 h-5 flex items-center justify-center text-red-500"
          title="Nicht mitbringen"
        >
          <span className="material-symbols-outlined text-lg">block</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateItem.mutate({ itemId: item.id, is_checked: !item.is_checked });
          }}
          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
            item.is_checked
              ? 'bg-teal-500 border-teal-500 text-white'
              : 'border-muted-foreground/30 hover:border-teal-500'
          }`}
          title={item.is_checked ? 'Als nicht gepackt markieren' : 'Als gepackt markieren'}
        >
          {item.is_checked && (
            <span className="material-symbols-outlined text-xs">check</span>
          )}
        </button>
      )}

      {/* Drag handle placeholder */}
      {canEdit && (
        <span className="material-symbols-outlined text-muted-foreground/40 text-sm cursor-grab opacity-0 group-hover:opacity-100 transition shrink-0">
          drag_indicator
        </span>
      )}

      {/* Item name */}
      <div
        className={`flex-1 min-w-0 ${
          isDnb
            ? 'line-through text-red-500/70'
            : item.is_checked
              ? 'line-through text-muted-foreground'
              : ''
        }`}
      >
        <InlineEdit
          value={item.name}
          onSave={(name) => updateItem.mutate({ itemId: item.id, name })}
          placeholder="Name..."
          className="text-sm"
          disabled={!canEdit}
        />
      </div>

      {/* "Nicht mitbringen" badge */}
      {isDnb && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium shrink-0 hidden sm:inline">
          Nicht mitbringen
        </span>
      )}

      {/* Quantity */}
      {!isDnb && (
        <InlineEdit
          value={item.quantity}
          onSave={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
          placeholder="Menge"
          className={`text-xs w-16 text-right shrink-0 ${
            item.is_checked ? 'text-muted-foreground/50' : 'text-muted-foreground'
          }`}
          disabled={!canEdit}
        />
      )}

      {/* Description tooltip */}
      {item.description && (
        <span
          className="material-symbols-outlined text-muted-foreground/40 text-sm shrink-0"
          title={item.description}
        >
          info
        </span>
      )}

      {/* Delete */}
      {canEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteItem.mutate(item.id);
          }}
          className="text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition shrink-0"
           title="Gegenstand löschen"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category section with progress
// ---------------------------------------------------------------------------
function CategorySection({
  category,
  canEdit,
  packingListId,
  onOpenDetail,
  catalogItems,
  allExistingItemNames,
}: {
  category: PackingCategory;
  canEdit: boolean;
  packingListId: number;
  onOpenDetail?: (item: PackingItem) => void;
  catalogItems: CatalogItem[];
  allExistingItemNames: string[];
}) {
  const updateCategory = useUpdateCategory(packingListId);
  const deleteCategory = useDeleteCategory(packingListId);
  const createItem = useCreateItem(packingListId, category.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const packableItems = category.items.filter((i) => !i.is_do_not_bring);
  const checkedCount = packableItems.filter((i) => i.is_checked).length;
  const totalCount = packableItems.length;

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Category header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
        {canEdit && (
          <span className="material-symbols-outlined text-muted-foreground/40 text-sm cursor-grab shrink-0">
            drag_indicator
          </span>
        )}
        <span className="material-symbols-outlined text-teal-600 text-lg shrink-0">folder</span>
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={category.name}
            onSave={(name) =>
              updateCategory.mutate({ categoryId: category.id, name })
            }
            placeholder="Kategorie-Name..."
            className="font-semibold text-sm"
            disabled={!canEdit}
          />
        </div>

        {/* Category progress */}
        {totalCount > 0 && (
          <div className="w-24 shrink-0">
            <ProgressBar checked={checkedCount} total={totalCount} size="sm" />
          </div>
        )}

        <span className="text-xs text-muted-foreground shrink-0">
           {totalCount} {totalCount === 1 ? 'Gegenstand' : 'Gegenstände'}
        </span>

        {canEdit && (
          <>
            {confirmDelete ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => deleteCategory.mutate(category.id)}
                  className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded"
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-2 py-1 bg-muted rounded"
                >
                  Nein
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive/60 hover:text-destructive transition shrink-0"
                 title="Kategorie löschen"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Items */}
      <div className="px-4 py-2">
        {category.items.length === 0 && !canEdit && (
          <p className="text-sm text-muted-foreground italic py-2">Keine Gegenstände</p>
        )}

        {category.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            canEdit={canEdit}
            packingListId={packingListId}
            categoryId={category.id}
            onOpenDetail={onOpenDetail}
          />
        ))}

        {canEdit && (
          <QuickAddItem
            onAdd={(name, isDoNotBring, quantity, description) =>
              createItem.mutate({
                name,
                is_do_not_bring: isDoNotBring,
                quantity: quantity || '',
                description: description || '',
              })
            }
            isPending={createItem.isPending}
            catalogItems={catalogItems}
            existingItemNames={allExistingItemNames}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export Menu Dropdown
// ---------------------------------------------------------------------------
function ExportMenu({
  packingListId,
  packingListTitle,
}: {
  packingListId: number;
  packingListTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleCopyText = async () => {
    try {
      const text = await fetchExportText(packingListId);
      await navigator.clipboard.writeText(text);
      toast.success('Packliste als Text kopiert');
    } catch {
      toast.error('Fehler beim Kopieren');
    }
    setOpen(false);
  };

  const handleExportPdf = async () => {
    try {
      await exportToPdf({
        title: packingListTitle,
        selector: '[data-pdf-content]',
      });
      toast.success('PDF heruntergeladen');
    } catch {
      toast.error('Fehler beim PDF-Export');
    }
    setOpen(false);
  };

  const handlePrint = () => {
    window.print();
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-muted transition text-muted-foreground"
        title="Exportieren"
      >
        <span className="material-symbols-outlined text-lg">download</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-10 min-w-48 py-1">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition text-left"
          >
            <span className="material-symbols-outlined text-lg">content_copy</span>
            Als Text kopieren
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition text-left"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            Als PDF exportieren
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition text-left"
          >
            <span className="material-symbols-outlined text-lg">print</span>
            Drucken
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item Detail Sheet (slide-over from right)
// ---------------------------------------------------------------------------
function ItemDetailSheet({
  item,
  open,
  onClose,
  canEdit,
  packingListId,
  categoryId,
}: {
  item: PackingItem | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  packingListId: number;
  categoryId: number;
}) {
  const updateItem = useUpdateItem(packingListId, categoryId);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftQuantity, setDraftQuantity] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  useEffect(() => {
    if (item) {
      setDraftName(item.name);
      setDraftQuantity(item.quantity);
      setDraftDescription(item.description);
      setEditingField(null);
    }
  }, [item]);

  if (!item) return null;

  const saveField = (field: string, value: string) => {
    if (field === 'name' && value.trim() && value.trim() !== item.name) {
      updateItem.mutate({ itemId: item.id, name: value.trim() });
    } else if (field === 'quantity' && value !== item.quantity) {
      updateItem.mutate({ itemId: item.id, quantity: value });
    } else if (field === 'description' && value !== item.description) {
      updateItem.mutate({ itemId: item.id, description: value });
    }
    setEditingField(null);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="pr-8">
          <SheetTitle className="flex items-center gap-2">
            {item.is_do_not_bring && (
              <span className="text-red-500">
                <span className="material-symbols-outlined text-xl">block</span>
              </span>
            )}
            {editingField === 'name' && canEdit ? (
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => saveField('name', draftName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveField('name', draftName);
                  if (e.key === 'Escape') { setDraftName(item.name); setEditingField(null); }
                }}
                className="flex-1 bg-background border rounded px-2 py-1 text-lg font-semibold outline-none focus:ring-1 focus:ring-teal-400"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => canEdit && setEditingField('name')}
                className={`text-left ${canEdit ? 'hover:bg-muted/50 rounded px-1 -mx-1' : ''}`}
              >
                {item.name}
              </button>
            )}
          </SheetTitle>
          <SheetDescription>
            Gegenstand-Details
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* "Nicht mitbringen" badge and toggle */}
          {item.is_do_not_bring && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <span className="material-symbols-outlined text-lg">block</span>
              <span className="font-medium">Nicht mitbringen</span>
            </div>
          )}

          {canEdit && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nicht mitbringen</span>
              <button
                type="button"
                onClick={() =>
                  updateItem.mutate({ itemId: item.id, is_do_not_bring: !item.is_do_not_bring })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  item.is_do_not_bring ? 'bg-red-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    item.is_do_not_bring ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Quantity */}
          {!item.is_do_not_bring && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Menge
              </label>
              {editingField === 'quantity' && canEdit ? (
                <input
                  value={draftQuantity}
                  onChange={(e) => setDraftQuantity(e.target.value)}
                  onBlur={() => saveField('quantity', draftQuantity)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveField('quantity', draftQuantity);
                    if (e.key === 'Escape') { setDraftQuantity(item.quantity); setEditingField(null); }
                  }}
                  className="mt-1 w-full bg-background border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-teal-400"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => canEdit && setEditingField('quantity')}
                  className={`mt-1 block text-sm ${canEdit ? 'hover:bg-muted/50 rounded px-1 -mx-1' : ''}`}
                >
                  {item.quantity || <span className="text-muted-foreground italic">Keine Angabe</span>}
                </button>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Beschreibung
            </label>
            {editingField === 'description' && canEdit ? (
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                onBlur={() => saveField('description', draftDescription)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setDraftDescription(item.description); setEditingField(null); }
                }}
                rows={4}
                className="mt-1 w-full bg-background border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-teal-400 resize-y"
                placeholder="Beschreibung (Markdown)..."
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => canEdit && setEditingField('description')}
                className={`mt-1 block w-full text-left text-sm ${canEdit ? 'hover:bg-muted/50 rounded px-1 -mx-1' : ''}`}
              >
                {item.description ? (
                  <MarkdownRenderer content={item.description} />
                ) : (
                  <span className="text-muted-foreground italic">Keine Beschreibung</span>
                )}
              </button>
            )}
          </div>

          {/* Supply link */}
          {item.supply_name && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Material / Zutat
              </label>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-teal-600 text-lg">link</span>
                <span>{item.supply_name}</span>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Share Management Section
// ---------------------------------------------------------------------------
function ShareManagement({ packingListId }: { packingListId: number }) {
  const { data: shares, isLoading } = usePackingListShares(packingListId);
  const createShare = useCreateShare(packingListId);
  const deactivateShare = useDeactivateShare(packingListId);
  const [newLabel, setNewLabel] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    createShare.mutate(
      { label: newLabel.trim() || undefined },
      {
        onSuccess: () => {
          setNewLabel('');
          setShowCreate(false);
          toast.success('Share-Link erstellt');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/packing-lists/shared/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link kopiert');
  };

  const handleDeactivate = (shareId: number) => {
    deactivateShare.mutate(shareId, {
      onSuccess: () => toast.success('Share-Link deaktiviert'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  const activeShares = shares?.filter((s) => s.is_active) ?? [];

  return (
    <div className="border rounded-lg bg-card p-4 print:hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-600 text-lg">share</span>
          Teilen
        </h3>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs px-2 py-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md hover:opacity-90 transition"
        >
          Neuen Link erstellen
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-muted/30 rounded-lg">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Bezeichnung (optional), z.B. 'Für Max'"
            className="flex-1 px-2 py-1.5 rounded border text-sm bg-background"
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createShare.isPending}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm disabled:opacity-50"
          >
            Erstellen
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewLabel(''); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Share links list */}
      {isLoading ? (
        <div className="animate-pulse h-12 bg-muted rounded" />
      ) : activeShares.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Noch keine Share-Links vorhanden. Erstelle einen Link, damit andere deine Packliste sehen und Items abhaken können.
        </p>
      ) : (
        <div className="space-y-2">
          {activeShares.map((share) => (
            <div
              key={share.id}
              className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-sm"
            >
              <span className="material-symbols-outlined text-muted-foreground text-lg">link</span>
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">
                  {share.label || 'Share-Link'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Erstellt: {new Date(share.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyLink(share.token)}
                className="p-1.5 rounded hover:bg-muted transition text-muted-foreground"
                title="Link kopieren"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeactivate(share.id)}
                disabled={deactivateShare.isPending}
                className="p-1.5 rounded hover:bg-destructive/10 transition text-destructive/60 hover:text-destructive disabled:opacity-50"
                title="Link deaktivieren"
              >
                <span className="material-symbols-outlined text-sm">link_off</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggestion Chip (quick-add)
// ---------------------------------------------------------------------------
function SuggestionChip({
  item,
  onAdd,
  isAdding,
}: {
  item: SuggestionItem;
  onAdd: (item: SuggestionItem) => void;
  isAdding: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={isAdding}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-full
        hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700
        transition disabled:opacity-50 bg-card"
      title={item.description || `${item.name} hinzufügen`}
    >
      <span className="material-symbols-outlined text-sm text-teal-500">add</span>
      <span className="truncate max-w-[200px]">{item.name}</span>
      {item.quantity && (
        <span className="text-xs text-muted-foreground ml-1">({item.quantity})</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Suggestion Panel (main suggestions UI)
// ---------------------------------------------------------------------------
function SuggestionPanel({
  packingListId,
  categories,
}: {
  packingListId: number;
  categories: PackingCategory[];
}) {
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string | undefined>(undefined);
  const [targetCategoryId, setTargetCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const { data: randomSuggestions, refetch: refetchRandom } = useRandomSuggestions(packingListId);
  const { data: catalogData } = useCatalogSuggestions(packingListId, {
    category: selectedCatalogCategory,
    search: catalogSearch || undefined,
    enabled: showFullCatalog,
  });
  const { data: suggestionCats } = useSuggestionCategories();
  const aiSuggest = useAiSuggestItems(packingListId);
  const createItemDynamic = useCreateItemDynamic(packingListId);

  // Update target category when categories change
  useEffect(() => {
    if (categories.length > 0 && !categories.find((c) => c.id === targetCategoryId)) {
      setTargetCategoryId(categories[0].id);
    }
  }, [categories, targetCategoryId]);

  const handleAddSuggestion = (item: SuggestionItem) => {
    if (targetCategoryId <= 0) {
      toast.error('Bitte erst eine Kategorie erstellen');
      return;
    }
    createItemDynamic.mutate(
      {
        categoryId: targetCategoryId,
        name: item.name,
        quantity: item.quantity || undefined,
        description: item.description || undefined,
        is_do_not_bring: item.is_do_not_bring || undefined,
      },
      {
        onSuccess: () => toast.success(`"${item.name}" hinzugefügt`),
        onError: (err) => toast.error('Fehler beim Hinzufügen', { description: err.message }),
      },
    );
    setAddedItems((prev) => new Set(prev).add(item.name.toLowerCase()));
  };

  const handleAiSuggest = () => {
    const catName = categories.find((c) => c.id === targetCategoryId)?.name;
    aiSuggest.mutate(
      { category: catName, count: 5 },
      {
        onError: (err) => toast.error('KI-Vorschlag fehlgeschlagen', { description: err.message }),
      },
    );
  };

  const randomItems = (randomSuggestions?.items ?? []).filter(
    (item) => !addedItems.has(item.name.toLowerCase()),
  );

  return (
    <div className="border rounded-lg bg-card overflow-hidden print:hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 text-lg">lightbulb</span>
            Vorschläge
          </h3>
          <div className="flex items-center gap-2">
            {/* Target category selector */}
            <select
              value={targetCategoryId}
              onChange={(e) => setTargetCategoryId(Number(e.target.value))}
              className="text-xs px-2 py-1 border rounded bg-background"
              title="Ziel-Kategorie für neue Gegenstände"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowFullCatalog(!showFullCatalog)}
              className={`text-xs px-2 py-1 rounded-md transition ${
                showFullCatalog
                  ? 'bg-teal-100 text-teal-700'
                  : 'border hover:bg-muted'
              }`}
            >
              {showFullCatalog ? 'Katalog ausblenden' : 'Alle anzeigen'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick-add chips from random suggestions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Schnell hinzufügen
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setAddedItems(new Set());
                refetchRandom();
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition"
              title="Neue Vorschläge laden"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Neue Ideen
            </button>
          </div>
        </div>

        {randomItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {randomItems.map((item) => (
              <SuggestionChip
                key={item.name}
                item={item}
                onAdd={handleAddSuggestion}
                isAdding={false}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Alle Vorschläge wurden bereits hinzugefügt. Klicke auf "Neue Ideen" für weitere.
          </p>
        )}
      </div>

      {/* AI Suggestion Button */}
      <div className="px-4 py-3 border-t">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            KI-Vorschlag
          </span>
        </div>

        {aiSuggest.data && aiSuggest.data.items.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {aiSuggest.data.items
              .filter((item) => !addedItems.has(item.name.toLowerCase()))
              .map((item) => (
                <SuggestionChip
                  key={item.name}
                  item={item}
                  onAdd={handleAddSuggestion}
                  isAdding={false}
                />
              ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleAiSuggest}
          disabled={aiSuggest.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600
            text-white rounded-lg text-sm hover:opacity-90 transition disabled:opacity-50 w-full justify-center"
        >
          {aiSuggest.isPending ? (
            <>
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              KI denkt nach...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              KI-Vorschlag generieren
            </>
          )}
        </button>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          Basierend auf Titel und vorhandenen Gegenständen
        </p>
      </div>

      {/* Full catalog browser */}
      {showFullCatalog && (
        <div className="px-4 py-3 border-t bg-muted/10">
          <div className="flex items-center gap-2 mb-3">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="material-symbols-outlined text-sm text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Gegenstände suchen..."
                className="w-full pl-8 pr-3 py-1.5 border rounded-md text-sm bg-background"
              />
            </div>

            {/* Category filter */}
            <select
              value={selectedCatalogCategory ?? ''}
              onChange={(e) =>
                setSelectedCatalogCategory(e.target.value || undefined)
              }
              className="text-xs px-2 py-1.5 border rounded bg-background"
            >
              <option value="">Alle Kategorien</option>
              {(suggestionCats?.categories ?? []).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Catalog results */}
          {catalogData && catalogData.categories.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {catalogData.categories.map((cat) => (
                <div key={cat.name}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-teal-600">folder</span>
                    {cat.name}
                    <span className="text-[10px] font-normal">({cat.items.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items
                      .filter((item) => !addedItems.has(item.name.toLowerCase()))
                      .map((item) => (
                        <SuggestionChip
                          key={item.name}
                          item={item}
                          onAdd={handleAddSuggestion}
                          isAdding={false}
                        />
                      ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                {catalogData.total_available} Vorschläge verfügbar
              </p>
            </div>
          ) : catalogData ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              Keine passenden Vorschläge gefunden.
            </p>
          ) : (
            <div className="animate-pulse h-24 bg-muted rounded" />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main detail page
// ---------------------------------------------------------------------------
export default function PackingListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const packingListId = Number(id);

  const { data, isLoading, error } = usePackingList(packingListId);
  const packingList = data as PackingList | undefined;
  const updatePackingList = useUpdatePackingList(packingListId);
  const deletePackingList = useDeletePackingList();
  const createCategory = useCreateCategory(packingListId);
  const clonePackingList = useClonePackingList();
  const resetChecks = useResetChecks(packingListId);
  const { data: fullCatalog } = useFullCatalog();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Item detail sheet state
  const [detailItem, setDetailItem] = useState<PackingItem | null>(null);
  const [detailCategoryId, setDetailCategoryId] = useState(0);

  // Derived
  const canEdit = packingList?.can_edit ?? false;
  const isTemplate = packingList?.is_template ?? false;

  const totalItems = packingList?.categories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => !i.is_do_not_bring).length,
    0,
  ) ?? 0;
  const checkedItems = packingList?.categories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => !i.is_do_not_bring && i.is_checked).length,
    0,
  ) ?? 0;

  const catalogItems = fullCatalog?.items ?? [];
  const allExistingItemNames = packingList?.categories.flatMap(
    (cat) => cat.items.map((item) => item.name),
  ) ?? [];

  // --- Loading / error states ---
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="animate-pulse h-8 w-48 bg-muted rounded" />
        <div className="animate-pulse h-4 w-72 bg-muted rounded" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  if (error || !packingList) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorDisplay
          error={error}
          title="Packliste nicht gefunden"
          description="Die Packliste existiert nicht oder du hast keinen Zugriff."
          onBack={() => navigate('/packing-lists')}
          backLabel="Zurück zur Übersicht"
        />
      </div>
    );
  }

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      createCategory.mutate(
        { name: trimmed },
        { onSuccess: () => setNewCategoryName('') },
      );
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deletePackingList.mutate(packingListId, {
      onSuccess: () => {
        toast.success('Packliste gelöscht');
        setShowDeleteConfirm(false);
        navigate('/packing-lists');
      },
      onError: (err) => {
        toast.error('Fehler beim Löschen', { description: err.message });
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success('Link kopiert');
    }
  };

  const handleClone = () => {
    clonePackingList.mutate(packingListId, {
      onSuccess: (data) => {
        toast.success(isTemplate ? 'Packliste aus Vorlage erstellt' : 'Packliste kopiert');
        navigate(`/packing-lists/${data.id}`);
      },
      onError: (err) => {
        toast.error('Fehler beim Kopieren', { description: err.message });
      },
    });
  };

  const handleResetChecks = () => {
    resetChecks.mutate(undefined, {
      onSuccess: () => toast.success('Alle Häkchen zurückgesetzt'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Packliste löschen?"
        description="Alle Kategorien und Gegenstände werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deletePackingList.isPending}
      />

      {/* Item Detail Sheet */}
      <ItemDetailSheet
        item={detailItem}
        open={detailItem !== null}
        onClose={() => setDetailItem(null)}
        canEdit={canEdit && !isTemplate}
        packingListId={packingListId}
        categoryId={detailCategoryId}
      />

      {/* Back link */}
      <BackButton to="/packing-lists" />

      {/* Template badge */}
      {isTemplate && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <span className="material-symbols-outlined text-lg">library_books</span>
          <span>
            Dies ist eine Vorlage.{' '}
            <button
              onClick={handleClone}
              disabled={clonePackingList.isPending}
              className="underline font-medium hover:text-amber-900 disabled:opacity-50"
            >
              Klicke hier, um sie als eigene Packliste zu übernehmen.
            </button>
          </span>
        </div>
      )}

      {/* PDF content wrapper */}
      <div data-pdf-content>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={packingList.title}
              onSave={(title) => updatePackingList.mutate({ title })}
              placeholder="Titel..."
              className="text-xl sm:text-2xl font-bold"
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 print:hidden">
            {/* Visibility toggle */}
            {canEdit && !isTemplate && (
              <button
                type="button"
                onClick={() =>
                  updatePackingList.mutate({
                    visibility: packingList.visibility === 'private' ? 'link_only' : 'private',
                  })
                }
                className={`p-2 rounded-md hover:bg-muted transition ${
                  packingList.visibility === 'private' ? 'text-amber-600' : 'text-muted-foreground'
                }`}
                title={
                  packingList.visibility === 'private'
                    ? 'Privat — Nur du hast Zugriff. Klicken für Link-Zugang.'
                    : 'Per Link zugänglich — Klicken für privat.'
                }
              >
                <span className="material-symbols-outlined text-lg">
                  {packingList.visibility === 'private' ? 'lock' : 'link'}
                </span>
              </button>
            )}

            {/* Export menu */}
            <ExportMenu
              packingListId={packingListId}
              packingListTitle={packingList.title}
            />

            {/* Clone button */}
            {!isTemplate && (
              <button
                type="button"
                onClick={handleClone}
                disabled={clonePackingList.isPending}
                className="p-2 rounded-md hover:bg-muted transition text-muted-foreground disabled:opacity-50"
                title="Packliste kopieren"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
              </button>
            )}

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-md hover:bg-muted transition text-muted-foreground"
              title="Link kopieren"
            >
              <span className="material-symbols-outlined text-lg">share</span>
            </button>

            {/* Delete button (owner only) */}
            {canEdit && !isTemplate && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 rounded-md hover:bg-destructive/10 transition text-destructive/70 hover:text-destructive"
                title="Packliste löschen"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <InlineEdit
            value={packingList.description}
            onSave={(description) => updatePackingList.mutate({ description })}
            placeholder="Beschreibung hinzufügen..."
            className="text-sm text-muted-foreground"
            disabled={!canEdit}
          />
        </div>

        {/* Visibility indicator */}
        {!isTemplate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 print:hidden">
            <span className="material-symbols-outlined text-sm">
              {packingList.visibility === 'private' ? 'lock' : 'link'}
            </span>
            <span>
              {packingList.visibility === 'private' ? 'Privat' : 'Per Link zugänglich'}
            </span>
          </div>
        )}

        {/* Overall progress */}
        {totalItems > 0 && !isTemplate && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Fortschritt: {checkedItems} von {totalItems} gepackt
              </span>
              {canEdit && checkedItems > 0 && (
                <button
                  onClick={handleResetChecks}
                  disabled={resetChecks.isPending}
                  className="text-xs text-muted-foreground hover:text-foreground transition print:hidden disabled:opacity-50"
                >
                   Zurücksetzen
                </button>
              )}
            </div>
            <ProgressBar checked={checkedItems} total={totalItems} />
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-6">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">person</span>
            {packingList.owner_name}
          </span>
          {packingList.group_name && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">group</span>
              {packingList.group_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">category</span>
            {packingList.categories.length} Kategorien
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">checklist</span>
             {totalItems} Gegenstände
          </span>
          <span>
            Aktualisiert: {new Date(packingList.updated_at).toLocaleDateString('de-DE')}
          </span>
          {!canEdit && !isTemplate && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="material-symbols-outlined text-sm">visibility</span>
              Nur Ansicht
            </span>
          )}
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {packingList.categories.length === 0 && !canEdit && (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2 block">
                inventory_2
              </span>
              <p className="text-muted-foreground text-sm">Diese Packliste ist noch leer.</p>
            </div>
          )}

          {packingList.categories.length === 0 && canEdit && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2 block">
                create_new_folder
              </span>
              <p className="text-muted-foreground text-sm mb-1">Noch keine Kategorien vorhanden.</p>
               <p className="text-muted-foreground text-xs">Erstelle eine Kategorie, um Gegenstände hinzuzufügen.</p>
            </div>
          )}

          {packingList.categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              canEdit={canEdit && !isTemplate}
              packingListId={packingListId}
              onOpenDetail={(item) => {
                setDetailItem(item);
                setDetailCategoryId(category.id);
              }}
              catalogItems={catalogItems}
              allExistingItemNames={allExistingItemNames}
            />
          ))}
        </div>
      </div>

      {/* Suggestion Panel (for editable non-template lists with categories) */}
      {canEdit && !isTemplate && packingList.categories.length > 0 && (
        <div className="mt-6">
           <SuggestionPanel
            packingListId={packingListId}
            categories={packingList.categories}
          />
        </div>
      )}

      {/* Add category form */}
      {canEdit && !isTemplate && (
        <div className="mt-6 flex items-center gap-2 print:hidden">
          <span className="material-symbols-outlined text-teal-600 text-lg">add</span>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCategory();
            }}
             placeholder="Neue Kategorie hinzufügen..."
            className="flex-1 bg-transparent border-b border-dashed border-muted-foreground/30 text-sm py-2 outline-none focus:border-teal-500 placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim() || createCategory.isPending}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm disabled:opacity-50 hover:opacity-90 transition"
          >
             Hinzufügen
          </button>
        </div>
      )}

      {/* Share Management (for owners of non-template lists) */}
      {canEdit && !isTemplate && (
        <div className="mt-6">
          <ShareManagement packingListId={packingListId} />
        </div>
      )}
    </div>
  );
}
