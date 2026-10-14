import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnitOptions } from '@/api/supplies';
import { formatWeight } from '@/lib/format';
import {
  amountParts,
  formatAmount,
  formatCount,
  optionKeyFor,
  toCount,
  toGrams,
  type StoredAmount,
} from '@/lib/quantityUnits';
import type { UnitViewMode } from '@/hooks/useUnitViewMode';
import type { UnitOption } from '@/schemas/quantityUnits';
import UnitPicker from './UnitPicker';

export interface QuantityUnitItem extends StoredAmount {
  ingredient_id: number | null;
  ingredient_slug?: string;
  measuring_unit_id?: number | null;
  portion_id?: number | null;
  standard_measure_key?: string | null;
}

export const GRAMS_OPTION: UnitOption = {
  key: 'grams',
  kind: 'grams',
  label: 'g',
  grams_per_unit: 1,
  is_approx: false,
  has_weight: true,
  portion_id: null,
  measuring_unit_id: null,
  standard_measure_key: null,
};

/** The stored unit as an option; its weight comes from the entry itself (no request needed). */
export function storedOption(item: QuantityUnitItem): UnitOption {
  const grams = item.quantity_g ?? 0;
  const count = item.quantity ?? 0;
  if (item.unit_kind === 'grams') return GRAMS_OPTION;
  return {
    key: optionKeyFor(item) ?? 'stored',
    kind: item.unit_kind ?? 'portion',
    label: item.unit_label || item.measuring_unit_name || '',
    grams_per_unit: grams > 0 && count > 0 ? grams / count : null,
    is_approx: !!item.is_weight_approx,
    has_weight: grams > 0,
    portion_id: item.portion_id ?? null,
    measuring_unit_id: item.measuring_unit_id ?? null,
    standard_measure_key: item.standard_measure_key || null,
  };
}

/** Unit fields of a PATCH that switches an entry to `option`. */
export interface UnitChange {
  portion_id?: number | null;
  measuring_unit_id?: number | null;
  standard_measure_key?: string | null;
}

export function unitChangeFor(option: UnitOption): UnitChange {
  if (option.kind === 'portion') return { portion_id: option.portion_id, measuring_unit_id: null, standard_measure_key: null };
  if (option.kind === 'standard') {
    return { portion_id: null, measuring_unit_id: null, standard_measure_key: option.standard_measure_key };
  }
  return { portion_id: null, standard_measure_key: null, measuring_unit_id: option.measuring_unit_id };
}

/** Unit fields that restore the stored unit of `item` (e.g. for undo). */
export function storedUnitChange(item: QuantityUnitItem): UnitChange {
  if (item.unit_kind === 'portion') return { portion_id: item.portion_id ?? null, measuring_unit_id: null, standard_measure_key: null };
  if (item.unit_kind === 'standard') {
    return { portion_id: null, measuring_unit_id: null, standard_measure_key: item.standard_measure_key || null };
  }
  return { portion_id: null, standard_measure_key: null, measuring_unit_id: item.measuring_unit_id ?? null };
}

function useLazyUnitOptions(ingredientId: number | null) {
  const [requested, setRequested] = useState(false);
  const query = useUnitOptions(ingredientId ? [ingredientId] : [], requested);
  return {
    options: ingredientId ? query.data?.get(ingredientId) : undefined,
    isLoading: query.isLoading && requested,
    request: () => setRequested(true),
  };
}

/** Read-only amount; the user can switch the unit for viewing (nothing is saved). */
export function QuantityUnitLabel({
  item,
  viewMode = 'start',
  className,
}: {
  item: QuantityUnitItem;
  viewMode?: UnitViewMode;
  className?: string;
}) {
  const [viewOption, setViewOption] = useState<UnitOption | null>(null);
  const { options, isLoading, request } = useLazyUnitOptions(item.ingredient_id);
  const effective = viewOption ?? (viewMode === 'grams' ? GRAMS_OPTION : null);
  const text = formatAmount(amountParts(item, effective));

  if (!item.ingredient_id) return <span className={className}>{text}</span>;
  return (
    <UnitPicker
      className={className}
      options={options}
      isLoading={isLoading}
      selectedKey={effective?.key ?? optionKeyFor(item)}
      triggerLabel={text}
      onOpen={request}
      onSelect={setViewOption}
      ariaLabel="Menge in anderer Einheit anzeigen"
    />
  );
}

function parseCount(text: string): number {
  return parseFloat(text.replace(',', '.'));
}

/**
 * Editable amount in any unit. Switching the unit converts the number (grams stay); typing a
 * number and confirming saves exactly that count in the shown unit. Grams are always previewed.
 *
 * With `onConvertUnit`, switching to a unit with a known weight (and no typed amount pending)
 * saves right away at constant weight; the backend converts the count. Without it, or when a
 * weight is missing, the switch only prepares the field and is saved on confirm.
 */
export function QuantityUnitInput({
  item,
  viewMode = 'start',
  onCommit,
  onConvertUnit,
}: {
  item: QuantityUnitItem;
  viewMode?: UnitViewMode;
  /** `grams` is the entered amount in grams (null when the unit has no known weight). */
  onCommit: (change: UnitChange & { quantity: number; grams: number | null }) => void;
  onConvertUnit?: (unit: UnitChange, callbacks: { onError: () => void }) => void;
}) {
  const stored = useMemo(() => storedOption(item), [item]);
  const navigate = useNavigate();
  const startOption = viewMode === 'grams' && item.unit_kind !== 'grams' ? GRAMS_OPTION : stored;
  const startCount = (option: UnitOption) =>
    option.key === stored.key ? (item.quantity ?? 0) : (toCount(item.quantity_g ?? 0, option) ?? 0);

  const [unit, setUnit] = useState<UnitOption>(startOption);
  const [text, setText] = useState(formatCount(startCount(startOption)));
  const [dirty, setDirty] = useState(false);
  const { options, isLoading, request } = useLazyUnitOptions(item.ingredient_id);

  const resetToStored = () => {
    setUnit(startOption);
    setText(formatCount(startCount(startOption)));
    setDirty(false);
  };

  // A saved change (or another viewer's change) resets the field to the stored amount.
  useEffect(() => {
    resetToStored();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored.key, item.quantity, item.quantity_g, viewMode]);

  const count = parseCount(text);
  const grams = Number.isFinite(count) ? toGrams(count, unit) : null;

  const selectUnit = (option: UnitOption) => {
    if (option.key === unit.key) return;
    // Untouched fields show the stored amount, so convert the exact stored grams.
    const currentGrams = (dirty ? grams : item.quantity_g) ?? 0;
    const converted = currentGrams > 0 ? toCount(currentGrams, option) : null;
    setUnit(option);
    setText(formatCount(converted ?? 1));
    if (onConvertUnit && !dirty && converted != null && option.key !== stored.key) {
      onConvertUnit(unitChangeFor(option), { onError: resetToStored });
      return;
    }
    setDirty(dirty || converted == null);
  };

  const commit = () => {
    if (!dirty) return;
    if (!Number.isFinite(count) || count <= 0) {
      setText(formatCount(startCount(unit)));
      setDirty(false);
      return;
    }
    const unitChanged = unit.key !== stored.key;
    onCommit({ quantity: count, grams, ...(unitChanged ? unitChangeFor(unit) : {}) });
    setDirty(false);
  };

  const preview =
    grams != null && grams > 0
      ? `= ${unit.is_approx ? '≈ ' : ''}${formatWeight(grams)}`
      : 'Gewicht fehlt';

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        aria-label="Menge"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-14 px-1 py-0.5 text-body border rounded-lg bg-background text-center"
      />
      <UnitPicker
        options={options}
        isLoading={isLoading}
        selectedKey={unit.key}
        triggerLabel={unit.label || 'Einheit'}
        onOpen={request}
        onSelect={selectUnit}
        onMissingWeight={(option) => {
          if (item.ingredient_slug && option.portion_id != null) {
            navigate(`/ingredients/${item.ingredient_slug}?editPortion=${option.portion_id}#portions`);
          }
        }}
      />
      <span className={grams != null && grams > 0 ? 'text-caption text-muted-foreground' : 'text-caption text-warning'}>
        {preview}
      </span>
    </span>
  );
}
