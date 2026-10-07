import { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { useIngredientPortions } from '@/api/supplies';
import PortionPicker from '@/components/recipe/PortionPicker';
import { formatMealItemAmount } from '@/lib/ingredientAmount';
import { QuantityInput } from '@/pages/planning/QuantityInput';
import type { MealItem } from '@/schemas/mealPlan';
import type { UpdateMealItemVars } from '@/api/mealPlans';

export type MealItemPatch = Omit<UpdateMealItemVars, 'itemId'>;

const METRIC_UNITS = new Set(['g', 'gramm', 'ml', 'milliliter']);
const NOTE_MAX_LENGTH = 500;

/** Read-only amount text, identical to the recipe views ("0,5 EL (15 g)"). */
export function MealItemAmountText({ item }: { item: MealItem }) {
  const { primary, secondary } = formatMealItemAmount(item);
  return (
    <span className={item.has_missing_weight ? 'text-destructive' : undefined}>
      {primary}
      {secondary && <span className="text-muted-foreground/60 ml-0.5">({secondary})</span>}
    </span>
  );
}

/** Quantity plus unit/portion selection for a single ingredient of the plan. */
export function MealItemAmountEditor({
  item,
  onUpdateItem,
}: {
  item: MealItem;
  onUpdateItem: (itemId: number, patch: MealItemPatch) => void;
}) {
  const { data: portions = [] } = useIngredientPortions(item.ingredient_slug);
  const portionId = item.portion_id ?? null;
  const unitName = item.measuring_unit_name;
  const hasLegacyUnit = portionId == null && unitName !== '' && !METRIC_UNITS.has(unitName.toLowerCase());
  const missingPortion = portionId != null && !portions.some((p) => p.id === portionId);
  const selectedFallback = hasLegacyUnit
    ? { id: -1, name: unitName, weight_g: item.quantity_g != null && item.quantity ? item.quantity_g / item.quantity : null }
    : missingPortion
      ? { id: portionId, name: item.portion_name || unitName, weight_g: item.quantity_g != null && item.quantity ? item.quantity_g / item.quantity : null }
      : null;

  return (
    <span className="inline-flex items-center gap-1">
      <QuantityInput value={item.quantity ?? 0} onChange={(quantity) => onUpdateItem(item.id, { quantity })} />
      <PortionPicker
        className="w-32"
        portions={portions}
        value={selectedFallback ? selectedFallback.id : portionId}
        selectedFallback={selectedFallback}
        showGramsSection={false}
        onSelectPortion={(id) => {
          if (id !== portionId) onUpdateItem(item.id, { portion_id: id });
        }}
        onSelectStandardMeasure={() => undefined}
        onSelectGrams={() => undefined}
      />
      {item.quantity_g != null && item.quantity_g > 0 && portionId != null && !METRIC_UNITS.has((item.portion_name ?? '').toLowerCase()) && (
        <span className="text-caption text-muted-foreground/60">({formatMealItemAmount(item).secondary})</span>
      )}
    </span>
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
  onUpdateItem?: (itemId: number, patch: MealItemPatch) => void;
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
