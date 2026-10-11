import { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { QuantityUnitInput, QuantityUnitLabel, storedUnitChange } from '@/components/quantity/QuantityUnit';
import { useUnitViewMode } from '@/hooks/useUnitViewMode';
import { notify } from '@/lib/notify';
import { amountParts, formatAmount } from '@/lib/quantityUnits';
import type { MealItem } from '@/schemas/mealPlan';
import type { UpdateMealItemVars } from '@/api/mealPlans';

export type MealItemPatch = Omit<UpdateMealItemVars, 'itemId'>;

export interface MealItemUpdateCallbacks {
  /** Called with the saved item. */
  onSuccess?: (item: MealItem) => void;
  /** Called after a failed save (the error toast is shown by the handler). */
  onError?: () => void;
}

export type MealItemUpdateHandler = (itemId: number, patch: MealItemPatch, callbacks?: MealItemUpdateCallbacks) => void;

const NOTE_MAX_LENGTH = 500;

/** Read-only amount text, identical to the recipe views ("0,5 EL (15 g)"). */
export function MealItemAmountText({ item }: { item: MealItem }) {
  const [viewMode] = useUnitViewMode();
  return <QuantityUnitLabel item={item} viewMode={viewMode} />;
}

/**
 * Quantity plus unit/portion selection for a single ingredient of the plan. Switching the unit
 * without typing an amount saves at constant weight ("55 g" → "0,55 Stück (55 g)") and offers undo.
 */
export function MealItemAmountEditor({
  item,
  onUpdateItem,
}: {
  item: MealItem;
  onUpdateItem: MealItemUpdateHandler;
}) {
  const [viewMode] = useUnitViewMode();

  const convertUnit = (unit: MealItemPatch, { onError }: { onError: () => void }) => {
    const previousText = formatAmount(amountParts(item));
    const restore: MealItemPatch = { quantity: item.quantity ?? undefined, ...storedUnitChange(item) };
    onUpdateItem(item.id, unit, {
      onSuccess: (saved) =>
        notify.changed('Einheit', () => onUpdateItem(item.id, restore), {
          description: `${previousText} → ${formatAmount(amountParts(saved))}`,
        }),
      onError,
    });
  };

  return (
    <QuantityUnitInput
      item={item}
      viewMode={viewMode}
      onCommit={(change) => onUpdateItem(item.id, change)}
      onConvertUnit={convertUnit}
    />
  );
}

/** Free-text note of a single ingredient; editable with a small toggle, text-only otherwise. */
export function MealItemNote({
  item,
  canEdit,
  onUpdateItem,
}: {
  item: MealItem;
  canEdit: boolean;
  onUpdateItem?: MealItemUpdateHandler;
}) {
  const savedNote = item.note ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(savedNote);
  const editable = canEdit && onUpdateItem != null;

  if (!editable) {
    return savedNote ? <p className="text-caption text-muted-foreground italic break-words">{savedNote}</p> : null;
  }

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== savedNote) onUpdateItem(item.id, { note: next });
  };

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={draft}
        maxLength={NOTE_MAX_LENGTH}
        placeholder="Notiz, z. B. ohne Zwiebeln"
        aria-label={`Notiz zu ${item.ingredient_name}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setDraft(savedNote);
            setEditing(false);
          }
        }}
        className="w-full px-2 py-1 text-caption border rounded-lg bg-background"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(savedNote);
        setEditing(true);
      }}
      className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground text-left"
      aria-label={savedNote ? `Notiz bearbeiten: ${savedNote}` : 'Notiz hinzufügen'}
    >
      <StickyNote className="w-3 h-3 shrink-0" />
      <span className={savedNote ? 'italic break-words' : ''}>{savedNote || 'Notiz'}</span>
    </button>
  );
}
