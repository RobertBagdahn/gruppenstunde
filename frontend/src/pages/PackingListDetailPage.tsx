import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  usePackingList,
  useUpdatePackingList,
  useDeletePackingList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useClonePackingList,
  useResetChecks,
  fetchExportText,
} from '@/api/packingLists';
import { exportToPdf } from '@/lib/pdfExport';
import type { PackingCategory, PackingItem } from '@/schemas/packingList';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';

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
}: {
  onAdd: (name: string) => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
      setTimeout(() => ref.current?.focus(), 50);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="material-symbols-outlined text-muted-foreground text-lg">add</span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder="Gegenstand hinzufuegen..."
        disabled={isPending}
        className="flex-1 bg-transparent border-b border-dashed border-muted-foreground/30 text-sm py-1 outline-none focus:border-teal-500 placeholder:text-muted-foreground/50"
      />
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
}: {
  item: PackingItem;
  canEdit: boolean;
  packingListId: number;
  categoryId: number;
}) {
  const updateItem = useUpdateItem(packingListId, categoryId);
  const deleteItem = useDeleteItem(packingListId, categoryId);

  return (
    <div className="flex items-center gap-2 group py-1">
      {/* Checkbox */}
      <button
        type="button"
        onClick={() =>
          updateItem.mutate({ itemId: item.id, is_checked: !item.is_checked })
        }
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

      {/* Drag handle placeholder */}
      {canEdit && (
        <span className="material-symbols-outlined text-muted-foreground/40 text-sm cursor-grab opacity-0 group-hover:opacity-100 transition shrink-0">
          drag_indicator
        </span>
      )}

      {/* Item name */}
      <div className={`flex-1 min-w-0 ${item.is_checked ? 'line-through text-muted-foreground' : ''}`}>
        <InlineEdit
          value={item.name}
          onSave={(name) => updateItem.mutate({ itemId: item.id, name })}
          placeholder="Name..."
          className="text-sm"
          disabled={!canEdit}
        />
      </div>

      {/* Quantity */}
      <InlineEdit
        value={item.quantity}
        onSave={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
        placeholder="Menge"
        className={`text-xs w-16 text-right shrink-0 ${
          item.is_checked ? 'text-muted-foreground/50' : 'text-muted-foreground'
        }`}
        disabled={!canEdit}
      />

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
          onClick={() => deleteItem.mutate(item.id)}
          className="text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition shrink-0"
          title="Gegenstand loeschen"
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
}: {
  category: PackingCategory;
  canEdit: boolean;
  packingListId: number;
}) {
  const updateCategory = useUpdateCategory(packingListId);
  const deleteCategory = useDeleteCategory(packingListId);
  const createItem = useCreateItem(packingListId, category.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const checkedCount = category.items.filter((i) => i.is_checked).length;
  const totalCount = category.items.length;

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
          {totalCount} {totalCount === 1 ? 'Gegenstand' : 'Gegenstaende'}
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
                title="Kategorie loeschen"
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
          <p className="text-sm text-muted-foreground italic py-2">Keine Gegenstaende</p>
        )}

        {category.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            canEdit={canEdit}
            packingListId={packingListId}
            categoryId={category.id}
          />
        ))}

        {canEdit && (
          <QuickAddItem
            onAdd={(name) => createItem.mutate({ name })}
            isPending={createItem.isPending}
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
// Main detail page
// ---------------------------------------------------------------------------
export default function PackingListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const packingListId = Number(id);

  const { data: packingList, isLoading, error } = usePackingList(packingListId);
  const updatePackingList = useUpdatePackingList(packingListId);
  const deletePackingList = useDeletePackingList();
  const createCategory = useCreateCategory(packingListId);
  const clonePackingList = useClonePackingList();
  const resetChecks = useResetChecks(packingListId);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Derived
  const canEdit = packingList?.can_edit ?? false;
  const isTemplate = packingList?.is_template ?? false;

  const totalItems = packingList?.categories.reduce(
    (sum, cat) => sum + cat.items.length,
    0,
  ) ?? 0;
  const checkedItems = packingList?.categories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.is_checked).length,
    0,
  ) ?? 0;

  // --- Loading / error states ---
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="animate-pulse h-8 w-48 bg-muted rounded" />
        <div className="animate-pulse h-4 w-72 bg-muted rounded" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  if (error || !packingList) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <ErrorDisplay
          error={error}
          title="Packliste nicht gefunden"
          description="Die Packliste existiert nicht oder du hast keinen Zugriff."
          onBack={() => navigate('/packing-lists')}
          backLabel="Zurueck zur Uebersicht"
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
        toast.success('Packliste geloescht');
        setShowDeleteConfirm(false);
        navigate('/packing-lists');
      },
      onError: (err) => {
        toast.error('Fehler beim Loeschen', { description: err.message });
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
      onSuccess: () => toast.success('Alle Haekchen zurueckgesetzt'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Packliste loeschen?"
        description="Alle Kategorien und Gegenstaende werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deletePackingList.isPending}
      />

      {/* Back link */}
      <button
        onClick={() => navigate('/packing-lists')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Alle Packlisten
      </button>

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
              Klicke hier, um sie als eigene Packliste zu uebernehmen.
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
                title="Packliste loeschen"
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
            placeholder="Beschreibung hinzufuegen..."
            className="text-sm text-muted-foreground"
            disabled={!canEdit}
          />
        </div>

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
                  Zuruecksetzen
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
            {totalItems} Gegenstaende
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
              <p className="text-muted-foreground text-xs">Erstelle eine Kategorie, um Gegenstaende hinzuzufuegen.</p>
            </div>
          )}

          {packingList.categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              canEdit={canEdit && !isTemplate}
              packingListId={packingListId}
            />
          ))}
        </div>
      </div>

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
            placeholder="Neue Kategorie hinzufuegen..."
            className="flex-1 bg-transparent border-b border-dashed border-muted-foreground/30 text-sm py-2 outline-none focus:border-teal-500 placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim() || createCategory.isPending}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm disabled:opacity-50 hover:opacity-90 transition"
          >
            Hinzufuegen
          </button>
        </div>
      )}
    </div>
  );
}
