/**
 * InlineIngredientEditor — Edit-Mode for recipe ingredients on the detail page.
 * Allows editing quantities, units, notes, adding/removing items, and AI estimation.
 */
import { forwardRef, useState, useCallback, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import {
  useUpdateRecipeItem,
  useDeleteRecipeItem,
  useCreateRecipeItem,
  useEstimateQuantities,
  usePatchRecipeItem,
  useCreateExchangeGroup,
} from '@/api/recipes';
import { useUpdateIngredient } from '@/api/supplies';
import { useCurrentUser } from '@/api/auth';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import IngredientDetailSearchDialog from './IngredientDetailSearchDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { normalizeServingContext, scaleQuantity, toBasePerServing } from '@/lib/cookingQuantityScale';
import { AiVoteButtons } from '@/components/shared/AiVoteButtons';
import { Button } from '@/components/ui/button';
import type { RecipeItem } from '@/schemas/recipe';
import type { EstimateQuantityItem } from '@/schemas/recipe';

// --- Types ---

export interface EditableItem {
  id: number;
  portion_id: number | null;
  ingredient_id: number | null;
  ingredient_name: string;
  quantity: number;
  /** Raw input string while the user is typing — allows empty/partial input */
  quantityInput: string;
  measuring_unit_name: string | null;
  note: string;
  sort_order: number;
  is_optional: boolean;
  exchange_group_id: number | null;
  exchange_position: number | null;
  ingredient_portions: { id: number; name: string; quantity: number; weight_g: number | null; measuring_unit_name: string | null; rank: number }[];
  /** Backend-computed weight (grams) for `baseQuantity` — authoritative, unlike
   *  the client-side `ingredient_portions[].weight_g` lookup (which can be
   *  wrong/missing if `portion_id` doesn't match any listed portion). Used to
   *  derive a stable grams-per-unit ratio for sorting, see `getItemWeightG`. */
  baseWeightG: number;
  baseQuantity: number;
  clientRequestId?: string;
  isNew?: boolean;
  isDeleted?: boolean;
  isDirty?: boolean;
  /** Set when an AI quantity estimate was just applied to this row, holding
   *  the AI's intended total gram amount. Sent to the backend as
   *  `expected_grams_total` on save so it can reject the update if the
   *  resulting quantity/portion combination doesn't match (safety net —
   *  see fix-portion-integrity-and-ai-estimate). Cleared on any further
   *  manual edit of quantity or portion. */
  aiExpectedGramsTotal?: number;
}

interface AiIngredientSuggestion {
  ingredient_id: number;
  ingredient_name: string;
  portion_id: number;
  portion_name: string;
  quantity: number;
  is_new_ingredient: boolean;
  note: string;
}

interface InlineIngredientEditorProps {
  recipeId: number | null;
  recipeSlug: string;
  items: RecipeItem[];
  portions: number | null;
  /** Fixed temporary context for the total quantities entered in this editor. */
  inputPortions: number;
  /** True when incoming item quantities are already totals for the input context. */
  itemsAreContextual?: boolean;
  /** Called after successful save. In the Wizard, this can trigger navigation. */
  onSave?: () => void;
  onClose: () => void;
  onSaved: () => void;
  onCreateDraft?: (items: DraftIngredientItem[]) => Promise<DraftCreationResult | null>;
}

export interface DraftIngredientItem {
  portion_id: number | null;
  client_request_id?: string;
  idempotency_key?: string;
  quantity: number;
  sort_order: number;
  note: string;
  is_optional: boolean;
}

export interface DraftCreationResult {
  recipeId: number;
  recipeSlug: string;
  items: RecipeItem[];
}

export interface InlineIngredientEditorHandle {
  save: () => Promise<boolean>;
}

// --- Helpers ---

/** Normalize items to quantities matching their selected portion unit.
 *  Direct metric portions are shown in grams; composite and non-metric
 *  portions are shown as counts of that portion.
 *
 *  CRITICAL LABELING RULE (fix for recipe #434 bug):
 *  ================================================
 *  Portions fall into two categories by their `quantity` field:
 *
  *  1. Composite portions (quantity !== 1):
  *     Example: "1 Portion Nudeln" (quantity=125, weight_g=125, measuring_unit="Gramm")
  *     These are pre-scaled portions. The editor quantity is a count of those
  *     portions. The label MUST be the portion's own name ("1 Portion Nudeln"),
 *     NOT the underlying measuring_unit_name ("Gramm").
 *     Bug scenario: User sees "Gramm" label, enters "500", saved as 500×125=62,500g
  *     Fix: Label is "1 Portion Nudeln" so user enters "2.24" correctly.
 *
 *  2. Direct-unit portions (quantity === 1):
 *     Examples: "Gramm" (quantity=1, measuring_unit="Gramm"),
 *               "Stück" (quantity=1, measuring_unit="Stück")
 *     These are direct units. The label is the measuring_unit_name.
 *
 *  The labeling rule is applied consistently in:
 *  - normalizeItems() [this function]
 *  - handlePortionChange()
 *  - Dropdown option rendering
 *  - Add ingredient flows (handleAddIngredient, handleAddFromDialog, handleSelectAlternative)
 */

/** Formats a gram value compactly for inline display next to a portion unit,
 *  e.g. "125g" or "1,3kg". Used in the AI-Mengenschätzung preview table so the
 *  gram equivalent is always visible regardless of the portion unit shown. */
function formatGramsShort(grams: number): string {
  if (!Number.isFinite(grams) || grams <= 0) return '0g';
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1).replace('.', ',')}kg`;
  }
  return `${Math.round(grams * 10) / 10}g`;
}

export const BASE_METRIC_UNIT_NAMES = new Set(['Gramm', 'g', 'kg', 'Kilogramm', 'Milliliter', 'ml', 'Liter', 'l']);

type EditablePortion = EditableItem['ingredient_portions'][number];

/** A portion is entered directly in a metric unit only when it is not a
 * pre-scaled/composite portion. For example, "1 Portion trocken" uses the
 * underlying unit "Gramm", but the editor quantity is a portion count. */
function isDirectMetricPortion(portion: EditablePortion | undefined, fallbackUnit: string | null | undefined): boolean {
  if (portion && portion.quantity !== 1) return false;
  return BASE_METRIC_UNIT_NAMES.has(portion?.measuring_unit_name ?? fallbackUnit ?? 'g');
}

/** Authoritative gram weight for an item's *current* quantity.
 *
 *  Prefers the backend-computed `baseWeightG`/`baseQuantity` ratio over a
 *  client-side `ingredient_portions[].weight_g` lookup by `portion_id`. That
 *  lookup can silently return the wrong value (or `undefined`, defaulting to
 *  `0`/`1`) when an ingredient has multiple portions sharing the same
 *  measuring_unit/label (e.g. two portions both labeled "Gramm" with
 *  different `weight_g`, or a "Packung" portion with `weight_g: null`) — this
 *  was the cause of the AI-Mengenschätzung preview showing wrong "Alt" values
 *  and units appearing to "jump" between renders. `baseWeightG` is set once
 *  from the backend's `RecipeItemOut.weight_g` (always correct, since the
 *  backend resolves it from the item's actual `portion` FK, not by name) and
 *  is kept in sync whenever `quantity` or `portion_id` changes. */
export function getItemWeightG(item: EditableItem): number {
  const currentPortion = item.ingredient_portions?.find((p) => p.id === item.portion_id);
  if (isDirectMetricPortion(currentPortion, item.measuring_unit_name)) {
    return item.quantity;
  }
  const portionWeightG = item.baseQuantity > 0 ? item.baseWeightG / item.baseQuantity : (currentPortion?.weight_g ?? 1);
  return Math.round(item.quantity * portionWeightG * 100) / 100;
}

/** Merges an AI quantity estimate into an EditableItem, applying `portion_id`
 *  and `quantity` atomically. Extracted as a pure function so the fix for the
 *  "AI-Mengenschätzung corrupts data" bug is independently unit-testable
 *  (see __tests__/InlineIngredientEditor.applyEstimate.test.ts).
 *
 *  Never leaves the item on its previous portion while only updating
 *  quantity: the backend always resolves `estimate.portion_id` to the
 *  ingredient's current active rank=1 portion, which may differ from
 *  `item.portion_id` (e.g. item was stored on "1 Prise" while the estimate
 *  targets "100g Salz"). Applying only `quantity` would silently multiply
 *  the gram amount by the wrong portion's weight_g on save. */
export function applyEstimateToItem(
  item: EditableItem,
  estimate: EstimateQuantityItem,
  displayScale = 1,
): EditableItem {
  const targetPortion = item.ingredient_portions?.find((p) => p.id === estimate.portion_id);
  const isMetric = isDirectMetricPortion(targetPortion, estimate.unit);
  const displayedQty = isMetric
    ? scaleQuantity(estimate.grams_total, displayScale)
    : scaleQuantity(estimate.quantity_per_portion, displayScale);
  const displayedGrams = scaleQuantity(estimate.grams_total, displayScale);

  return {
    ...item,
    portion_id: estimate.portion_id,
    measuring_unit_name: estimate.unit,
    quantity: displayedQty,
    quantityInput: String(displayedQty),
    baseWeightG: estimate.grams_total,
    baseQuantity: estimate.quantity_per_portion,
    aiExpectedGramsTotal: displayedGrams,
    isDirty: true,
  };
}

/** Convert an editor value back to the normalized RecipeItem quantity sent to
 * the API. Composite portions keep their unit count; direct metric portions
 * convert the displayed grams through their grams-per-unit ratio. */
export function toPersistedRecipeItemQuantity(item: EditableItem, scale: number): number {
  const currentPortion = item.ingredient_portions?.find((p) => p.id === item.portion_id);
  const isMetric = isDirectMetricPortion(currentPortion, item.measuring_unit_name);
  const portionWeightG = item.baseQuantity > 0
    ? item.baseWeightG / item.baseQuantity
    : (currentPortion?.weight_g ?? 1);
  const multiplier = isMetric ? item.quantity / portionWeightG : item.quantity;
  const normalizedMultiplier = Math.round(multiplier * 1000) / 1000;
  return toBasePerServing(normalizedMultiplier, scale);
}

export function normalizeItems(
  items: RecipeItem[],
  portions: number | null,
  inputPortions = 1,
  itemsAreContextual = false,
): EditableItem[] {
  const s = portions ?? 1;
  const context = normalizeServingContext(inputPortions);
  return items.map((item) => {
    // Find the weight_g of the current portion (used for the displayed LABEL
    // only — see below for why the gram-per-unit ratio does NOT come from here).
    const currentPortion = item.ingredient_portions?.find((p) => p.id === item.portion_id);

    // Gram-per-unit ratio: ALWAYS derived from the backend-authoritative
    // `item.weight_g` (RecipeItemOut.weight_g, resolved server-side from the
    // item's actual portion FK), never from a client-side lookup in
    // `ingredient_portions`. That lookup silently returns `undefined` — and
    // falls back to `weight_g ?? 1` — whenever the item's current portion is
    // missing from the list (e.g. soft-deleted, as observed for a Jodsalz
    // RecipeItem in recipe #59 "Linsensuppe"), producing a wildly wrong
    // editable quantity (was showing ~100x too small). See getItemWeightG(),
    // which already used this correct approach for the AI-estimate "Alt"
    // column — normalizeItems() must use the same authoritative source for
    // the actual editable value, not just for that one preview column.
    const portionWeightG = item.quantity > 0 ? item.weight_g / item.quantity : (currentPortion?.weight_g ?? 1);
    const isMetric = isDirectMetricPortion(currentPortion, item.measuring_unit_name);

    let qty: number;
    if (isMetric) {
      // Metric mass/volume units: quantity represents grams/ml directly
      const quantityInGrams = item.quantity * portionWeightG;
      const normalizedQuantity = s > 1 ? Math.round((quantityInGrams / s) * 100) / 100 : quantityInGrams;
      qty = itemsAreContextual ? quantityInGrams : scaleQuantity(normalizedQuantity, context);
    } else {
      // Non-metric unit portions (e.g. EL, TL, Stück, Prise): quantity represents portion count
      const normalizedQuantity = s > 1 ? Math.round((item.quantity / s) * 1000) / 1000 : item.quantity;
      qty = itemsAreContextual ? item.quantity : scaleQuantity(normalizedQuantity, context);
    }

    const label = currentPortion
      ? currentPortion.quantity !== 1
        ? currentPortion.name
        : (currentPortion.measuring_unit_name || currentPortion.name)
      : (item.measuring_unit_name || 'g');

    return {
      id: item.id,
      portion_id: item.portion_id, // Keep original portion_id for save
      ingredient_id: item.ingredient_id ?? null,
      ingredient_name: item.ingredient_name,
      quantity: qty,
      quantityInput: String(qty),
      measuring_unit_name: label,
      note: item.note,
      sort_order: item.sort_order,
      ingredient_portions: (item.ingredient_portions ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity, // Include quantity to detect composite portions
        weight_g: p.weight_g,
        measuring_unit_name: p.measuring_unit_name,
        rank: p.rank ?? 999,
      })),
      is_optional: item.is_optional ?? false,
      exchange_group_id: item.exchange_group_id ?? null,
      exchange_position: item.exchange_position ?? null,
      // Backend-computed weight for the raw (unscaled) quantity — authoritative
      // source for sorting (see `baseWeightG` doc comment on EditableItem).
      baseWeightG: item.weight_g,
      baseQuantity: item.quantity,
      clientRequestId: item.client_request_id ?? item.idempotency_key ?? undefined,
      // Legacy recipes with non-normalized portions still need normalization.
      isDirty: s > 1 || itemsAreContextual,
    };
  });
}

// --- Ingredient Row (own component so the per-row `useUpdateIngredient` hook
//     has a stable Fiber/hook-list regardless of how many rows are rendered) ---

interface IngredientRowProps {
  item: EditableItem;
  isSource: boolean;
  isAlt: boolean;
  isLastInGroup: boolean;
  editItems: EditableItem[];
  expandedNotes: Set<number>;
  setExpandedNotes: React.Dispatch<React.SetStateAction<Set<number>>>;
  handleQuantityInputChange: (id: number, raw: string) => void;
  handleQuantityBlur: (id: number) => void;
  handlePortionChange: (id: number, portionId: number) => void;
  handleNoteChange: (id: number, note: string) => void;
  handleDelete: (id: number) => void;
  setAlternativeTargetId: (id: number | null) => void;
  patchItem: ReturnType<typeof usePatchRecipeItem>;
  setEditItems: React.Dispatch<React.SetStateAction<EditableItem[]>>;
  user: { is_staff?: boolean } | undefined;
}

function IngredientRow({
  item,
  isSource,
  isAlt,
  isLastInGroup,
  editItems,
  expandedNotes,
  setExpandedNotes,
  handleQuantityInputChange,
  handleQuantityBlur,
  handlePortionChange,
  handleNoteChange,
  handleDelete,
  setAlternativeTargetId,
  patchItem,
  setEditItems,
  user,
}: IngredientRowProps) {
  // Mutation for this ingredient's verification status update.
  // This component is only ever mounted via JSX (not called as a plain
  // function inside a loop), so its hooks always run in a stable order.
  const updateIngredientMutation = useUpdateIngredient(
    item.ingredient_name.toLowerCase().replace(/\s+/g, '-'),
  );

  return (
    <div
      data-testid={`recipe-ingredient-row-${item.id}`}
      key={item.id}
      className={`flex items-center gap-3 p-3 border-l-4 bg-card transition-colors ${
        isAlt ? 'border-l-amber-400 pl-9 bg-muted/20' : isSource ? 'border-l-amber-400' : 'border-l-transparent'
      } ${
        isAlt && !isLastInGroup ? 'border border-b-0 border-t-0' : ''
      } ${
        isAlt && isLastInGroup ? 'rounded-b-lg border border-t-0 border-border' : ''
      } ${
        isSource && !isLastInGroup ? 'rounded-t-lg border border-b-0 border-border' : ''
      } ${
        isSource && isLastInGroup ? 'border rounded-lg border-border' : ''
      } ${
        !isSource && !isAlt ? 'border rounded-lg border-border hover:bg-muted/30' : ''
      } ${isSource ? 'hover:bg-muted/30' : ''}`}
    >
      <input
        type="text"
        inputMode="decimal"
        value={item.quantityInput}
        onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
        onBlur={() => handleQuantityBlur(item.id)}
        data-testid={`item-quantity-${item.id}`}
        className="w-20 px-2 py-1.5 text-sm text-right border rounded-md"
      />
      {item.ingredient_portions.length > 1 ? (
        <select
          value={item.portion_id ?? ''}
          onChange={(e) => handlePortionChange(item.id, parseInt(e.target.value))}
          data-testid={`item-portion-${item.id}`}
          className="text-xs text-muted-foreground min-w-[3.5rem] px-1 py-1.5 border rounded-md bg-background"
        >
          {item.ingredient_portions.map((p) => {
            // Use the same composite-portion label rule: if portion.quantity !== 1, show portion name
            const optionLabel = p.quantity !== 1 ? p.name : (p.measuring_unit_name || p.name);
            return (
              <option key={p.id} value={p.id}>
                {optionLabel}
              </option>
            );
          })}
        </select>
      ) : (
        <span className="text-xs text-muted-foreground min-w-[3.5rem]">
          {item.measuring_unit_name || 'g'}
        </span>
      )}
      <span className="text-xs text-muted-foreground min-w-[4rem] text-right tabular-nums">
        = {Math.round(getItemWeightG(item) * 10) / 10} g
      </span>
      <span className="flex-1 text-sm font-medium truncate">{item.ingredient_name}</span>
      {expandedNotes.has(item.id) || item.note ? (
        <input
          type="text"
          value={item.note}
          onChange={(e) => handleNoteChange(item.id, e.target.value)}
          placeholder="Notiz"
          className="w-24 px-2 py-1.5 text-xs border rounded-md text-muted-foreground"
        />
      ) : (
        <button
          type="button"
          onClick={() => setExpandedNotes((prev) => new Set(prev).add(item.id))}
          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
          title="Notiz hinzufügen"
        >
          <span className="material-symbols-outlined text-[20px]">sticky_note_2</span>
        </button>
      )}
      {/* Optional toggle (task 9.3) — disabled when in exchange group or unsaved */}
      <button
        type="button"
        disabled={item.exchange_group_id !== null || item.isNew === true}
        title={item.is_optional ? 'Als Pflicht-Zutat markieren' : 'Als optional markieren'}
        onClick={() => {
          patchItem.mutate(
            { itemId: item.id, data: { is_optional: !item.is_optional } },
            {
              onSuccess: () => {
                setEditItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, is_optional: !i.is_optional } : i,
                  ),
                );
              },
              onError: (err) => {
                toast.error('Fehler', { description: err.message });
              },
            },
          );
        }}
        className={`p-1.5 transition-colors rounded ${item.is_optional ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <span className="material-symbols-outlined text-[20px]">
          {item.is_optional ? 'toggle_on' : 'toggle_off'}
        </span>
      </button>
      {/* Alternative hinzufügen (tasks 9.1, 9.2) — only when not optional */}
      <button
        type="button"
        disabled={item.is_optional || item.isNew}
        title={item.isNew ? 'Bitte zuerst speichern' : 'Alternative hinzufügen'}
        onClick={() => setAlternativeTargetId(item.id)}
        className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
      </button>
      <button
        type="button"
        onClick={() => {
          const hasAlternatives = item.exchange_group_id != null
            && item.exchange_position === 0
            && editItems.some(
              (other) =>
                other.exchange_group_id === item.exchange_group_id &&
                other.id !== item.id &&
                !other.isDeleted,
            );
          if (hasAlternatives) {
            toast.error('Löschen nicht möglich', {
              description:
                'Dieses Item hat Alternativen. Bitte zuerst die Alternativen entfernen.',
            });
            return;
          }
          handleDelete(item.id);
        }}
        className="p-1.5 text-destructive/70 hover:text-destructive transition-colors"
        title="Entfernen"
        data-testid="recipe-ingredient-delete"
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
      {/* Verify button (staff only) */}
      {user?.is_staff && (
        <button
          type="button"
          disabled={updateIngredientMutation.isPending}
          title="Diese Zutat als verifiziert markieren"
          onClick={() => {
            updateIngredientMutation.mutate(
              { status: 'verified' },
              {
                onSuccess: () => {
                  toast.success('Zutat als verifiziert markiert');
                },
                onError: (err) => {
                  toast.error('Fehler beim Verifizieren', {
                    description: err.message,
                  });
                },
              },
            );
          }}
          className="p-1.5 text-green-600/70 hover:text-green-600 transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]" title="Verify">verified</span>
        </button>
      )}
    </div>
  );
}

// --- Component ---

const InlineIngredientEditor = forwardRef<InlineIngredientEditorHandle, InlineIngredientEditorProps>(function InlineIngredientEditor({
  recipeId,
  recipeSlug,
  items,
  portions,
  inputPortions,
  itemsAreContextual = false,
  onSave,
  onClose,
  onSaved,
  onCreateDraft,
}: InlineIngredientEditorProps, ref) {
  void recipeSlug; // used by Wizard context for future data fetching
  const scale = normalizeServingContext(inputPortions);

  const [editItems, setEditItems] = useState<EditableItem[]>(() => {
    return normalizeItems(items, portions, scale, itemsAreContextual);
  });
  const [showEstimate, setShowEstimate] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [estimateResult, setEstimateResult] = useState<EstimateQuantityItem[] | null>(null);
  const [selectedEstimates, setSelectedEstimates] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const saveConfirmationRef = useRef<((confirmed: boolean) => void) | null>(null);
  const pendingIngredientOperationsRef = useRef(new Set<Promise<void>>());
  const pendingSaveAfterOperationsRef = useRef<Promise<boolean> | null>(null);
  const latestHandleSaveRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));
  const [inputValue, setInputValue] = useState('');
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiIngredientSuggestion[] | null>(null);
  const [selectedAiSuggestions, setSelectedAiSuggestions] = useState<Set<number>>(new Set());
  const [aiSuggestInteractionId, setAiSuggestInteractionId] = useState<string | null>(null);
  const [detailSearchOpen, setDetailSearchOpen] = useState(false);

  const [alternativeTargetId, setAlternativeTargetId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const persistedRecipeId = recipeId ?? 0;
  const updateItem = useUpdateRecipeItem(persistedRecipeId);
  const deleteItem = useDeleteRecipeItem(persistedRecipeId);
  const createItem = useCreateRecipeItem(persistedRecipeId);
  const estimateQuantities = useEstimateQuantities(persistedRecipeId);
  const patchItem = usePatchRecipeItem(persistedRecipeId);
  const createExchangeGroup = useCreateExchangeGroup(persistedRecipeId);

  // --- Handlers ---

  // Handles raw string input — allows empty/partial values while typing.
  // The numeric quantity is only updated when the input is a valid number.
  const handleQuantityInputChange = useCallback((id: number, raw: string) => {
    // Allow empty string, digits, dot and comma as decimal separator
    const sanitized = raw.replace(',', '.');
    const parsed = parseFloat(sanitized);
    const isValid = sanitized !== '' && !isNaN(parsed) && parsed > 0;
    setEditItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantityInput: raw,
              quantity: isValid ? parsed : item.quantity,
              isDirty: true,
              // Any manual edit invalidates the AI-estimate expectation —
              // the plausibility check must only apply right after "Übernehmen".
              aiExpectedGramsTotal: undefined,
            }
          : item,
      ),
    );
  }, []);

  // Commits the input on blur — resets to current numeric value if input is empty/invalid
  const handleQuantityBlur = useCallback((id: number) => {
    setEditItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const sanitized = item.quantityInput.replace(',', '.');
        const parsed = parseFloat(sanitized);
        const valid = sanitized !== '' && !isNaN(parsed) && parsed > 0;
        return { ...item, quantityInput: String(valid ? parsed : item.quantity) };
      }),
    );
  }, []);

  const handleNoteChange = useCallback((id: number, note: string) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note, isDirty: true } : item)),
    );
  }, []);

  const handlePortionChange = useCallback((id: number, portionId: number) => {
    setEditItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newPortion = item.ingredient_portions.find((p) => p.id === portionId);
        if (!newPortion) return item;

        const currentGrams = getItemWeightG(item);
        const newWeightG = newPortion.weight_g ?? 1;
        const isNewMetric = isDirectMetricPortion(newPortion, newPortion.measuring_unit_name);

        const newMultiplier = Math.round((currentGrams / newWeightG) * 100) / 100;
        const newQty = isNewMetric
          ? currentGrams
          : newMultiplier;

        const label = newPortion.quantity !== 1
          ? newPortion.name
          : newPortion.measuring_unit_name ?? 'g';

        return {
          ...item,
          portion_id: portionId,
          measuring_unit_name: label,
          quantity: newQty,
          quantityInput: String(newQty),
          baseWeightG: currentGrams,
          baseQuantity: newMultiplier,
          isDirty: true,
          aiExpectedGramsTotal: undefined,
        };
      }),
    );
  }, []);

  const handleDelete = useCallback((id: number) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isDeleted: true } : item)),
    );
  }, []);

  const handleAddIngredient = useCallback(
    async (ingredient: { id: number; name: string; slug: string }) => {
      const maxSort = editItems.reduce((max, i) => Math.max(max, i.sort_order), 0);

      // Ingredients without a slug have not been created yet.
      // The UnknownIngredientDialog handles navigation to /ingredients/new.
      if (!ingredient.slug) return;

      // Fetch portions for this ingredient and select smart default
      try {
        const res = await fetch(`${API_BASE_URL}/api/ingredients/${ingredient.slug}/portions/`, { credentials: 'include' });
        const portions = await res.json();

        // Smart default: lowest-rank portion with weight_g > 0 (4.1, 4.3)
        const bestPortion = [...portions]
          .filter((p: { weight_g: number | null }) => (p.weight_g ?? 0) > 0)
          .sort((a: { rank?: number | null }, b: { rank?: number | null }) => (a.rank ?? 9999) - (b.rank ?? 9999))[0]
          ?? portions[0];

        if (!bestPortion) {
          toast.error('Keine Portion für diese Zutat gefunden');
          return;
        }

        // Use the same composite-portion label rule
        const portionLabel = bestPortion.quantity !== 1
          ? bestPortion.name
          : (bestPortion.measuring_unit_name || 'g');

        const isMetric = bestPortion.quantity === 1
          && BASE_METRIC_UNIT_NAMES.has(bestPortion.measuring_unit_name ?? 'g');
        const initialQuantity = isMetric ? (bestPortion.weight_g ?? 1) : 1;
        const displayedQuantity = scaleQuantity(initialQuantity, scale);
        const rowKey = `ing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setEditItems((prev) => [
          ...prev,
          {
            id: -Date.now(),
            portion_id: bestPortion.id,
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            quantity: displayedQuantity,
            quantityInput: String(displayedQuantity),
            measuring_unit_name: portionLabel,
            note: '',
            sort_order: maxSort + 1,
            ingredient_portions: portions.map((p: { id: number; name: string; quantity: number; weight_g: number | null; measuring_unit_name: string | null; rank?: number | null }) => ({
              id: p.id,
              name: p.name,
              quantity: p.quantity,
              weight_g: p.weight_g,
              measuring_unit_name: p.measuring_unit_name,
              rank: p.rank ?? 999,
            })),
            is_optional: false,
            exchange_group_id: null,
            exchange_position: null,
            baseWeightG: bestPortion.weight_g ?? 1,
            baseQuantity: 1,
            clientRequestId: rowKey,
            isNew: true,
            isDirty: true,
          },
        ]);
      } catch {
        toast.error('Fehler beim Laden der Portion');
      }
    },
    [editItems],
  );

  const trackIngredientOperation = useCallback((operation: Promise<void>): void => {
    pendingIngredientOperationsRef.current.add(operation);
    void operation.then(
      () => pendingIngredientOperationsRef.current.delete(operation),
      () => pendingIngredientOperationsRef.current.delete(operation),
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawSlug = params.get('newIngredientSlug');
    if (!rawSlug) return;

    const newSlug = rawSlug;
    let cancelled = false;

    async function handle() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ingredients/${encodeURIComponent(newSlug)}/`, { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) {
            navigate(window.location.pathname, { replace: true });
          }
          return;
        }
        const ingredient = await res.json();
        if (cancelled) return;

        handleAddIngredient({ id: ingredient.id, name: ingredient.name, slug: ingredient.slug });

        navigate(window.location.pathname, { replace: true });
      } catch {
        navigate(window.location.pathname, { replace: true });
      }
    }

    handle();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handles ingredient selection from the detail search dialog.
  // Unlike handleAddIngredient (which sets quantity=0), this adds the item with the
  // user-selected quantity from the IngredientQuantityDialog already filled in.
  const handleAddFromDialog = useCallback(
    async (
      ingredientId: number,
      ingredientName: string,
      ingredientSlug: string,
      portionId: number | null,
      _measuringUnitId: number | null,
      quantity: number,
    ) => {
      const maxSort = editItems.reduce((max, i) => Math.max(max, i.sort_order), 0);

      try {
        const res = await fetch(`${API_BASE_URL}/api/ingredients/${ingredientSlug}/portions/`, { credentials: 'include' });
        const portions = await res.json();

        let selectedPortion = portionId
          ? portions.find((p: { id: number }) => p.id === portionId) ?? null
          : null;

        if (!selectedPortion) {
          // Fall back to rank=1 (Normalportion) or first available
          selectedPortion = portions.find((p: { rank?: number }) => p.rank === 1) ?? portions[0] ?? null;
        }

        if (!selectedPortion) {
          toast.error('Keine Portion für diese Zutat gefunden');
          return;
        }

        // Use the same composite-portion label rule
        const portionLabel = selectedPortion!.quantity !== 1
          ? selectedPortion!.name
          : (selectedPortion!.measuring_unit_name || 'g');

        const selectedWeightG = selectedPortion!.weight_g ?? 1;
        const totalWeightG = selectedWeightG * quantity;
        const isMetric = selectedPortion!.quantity === 1
          && BASE_METRIC_UNIT_NAMES.has(selectedPortion!.measuring_unit_name ?? 'g');
        const displayedBaseQuantity = isMetric ? totalWeightG : quantity;
        const displayedQuantity = scaleQuantity(displayedBaseQuantity, scale);
        const rowKey = `ing-dlg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        setEditItems((prev) => [
          ...prev,
          {
            id: -Date.now(),
            portion_id: selectedPortion!.id,
            ingredient_id: ingredientId,
            ingredient_name: ingredientName,
            quantity: displayedQuantity,
            quantityInput: String(displayedQuantity),
            measuring_unit_name: portionLabel,
            note: '',
            sort_order: maxSort + 1,
            ingredient_portions: portions.map((p: { id: number; name: string; quantity: number; weight_g: number | null; measuring_unit_name: string | null; rank?: number }) => ({
              id: p.id,
              name: p.name,
              quantity: p.quantity,
              weight_g: p.weight_g,
              measuring_unit_name: p.measuring_unit_name,
              rank: p.rank ?? 999,
            })),
            is_optional: false,
            exchange_group_id: null,
            exchange_position: null,
            baseWeightG: totalWeightG,
            baseQuantity: quantity,
            clientRequestId: rowKey,
            isNew: true,
            isDirty: true,
          },
        ]);
      } catch {
        toast.error('Fehler beim Laden der Portion');
      }
    },
    [editItems],
  );

  // --- AI Estimate ---

  const handleEstimate = useCallback(async () => {
    try {
      const result = await estimateQuantities.mutateAsync();
      setEstimateResult(result.items);
      setShowEstimate(true);
    } catch {
      toast.error('AI-Schätzung fehlgeschlagen');
    }
  }, [estimateQuantities]);

  const handleApplyEstimate = useCallback(() => {
    if (!estimateResult || selectedEstimates.size === 0) return;
    const applied = selectedEstimates.size;
    setEditItems((prev) =>
      prev.map((item) => {
        if (!selectedEstimates.has(item.id)) return item;
        const estimate = estimateResult.find((e) => e.item_id === item.id);
        return estimate ? applyEstimateToItem(item, estimate, scale) : item;
      }),
    );
    setShowEstimate(false);
    setEstimateResult(null);
    setSelectedEstimates(new Set());
    toast.success(`${applied} von ${estimateResult.length} Mengen übernommen`);
  }, [estimateResult, selectedEstimates]);

  // --- AI Suggest Ingredients ---

  const handleAiSuggest = useCallback(async () => {
    setIsAiSuggesting(true);
    setAiSuggestInteractionId(null);
    try {
      const suggestRes = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/ai-suggest-ingredients/`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!suggestRes.ok) {
        let detail = 'KI-Vorschläge konnten nicht generiert werden';
        try {
          const errorData = await suggestRes.json();
          if (errorData.detail) detail = errorData.detail;
        } catch {
          // use default message if response body is not parseable
        }
        throw new Error(detail);
      }
      const data = await suggestRes.json();

      // Support both list response (legacy) and object response with interaction_id
      const suggestions: AiIngredientSuggestion[] = Array.isArray(data)
        ? data
        : (data.items ?? data.suggestions ?? []);
      const interactionId: string | null = !Array.isArray(data) ? (data.ai_interaction_id ?? null) : null;

      if (!suggestions || suggestions.length === 0) {
        toast.info('Keine weiteren Zutaten vorgeschlagen');
        return;
      }

      setAiSuggestions(suggestions);
      setSelectedAiSuggestions(new Set(suggestions.map((_, i) => i)));
      setAiSuggestInteractionId(interactionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'KI-Vorschläge konnten nicht generiert werden');
    } finally {
      setIsAiSuggesting(false);
    }
  }, [recipeId]);

  const handleApplyAiSuggestions = useCallback(async () => {
    if (!aiSuggestions || selectedAiSuggestions.size === 0) return;

    const selected = aiSuggestions.filter((_, i) => selectedAiSuggestions.has(i));
    try {
      const applyRes = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/ai-apply-ingredients/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          selected.map((s) => ({
            portion_id: s.portion_id,
            quantity: s.quantity,
            note: s.note || '',
          })),
        ),
      });
      if (!applyRes.ok) throw new Error('Anwenden fehlgeschlagen');

      await queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      toast.success(`${selected.length} Zutaten hinzugefügt`);
      setAiSuggestions(null);
      setSelectedAiSuggestions(new Set());
      onSaved();
    } catch {
      toast.error('Fehler beim Hinzufügen der Zutaten');
    }
  }, [aiSuggestions, selectedAiSuggestions, recipeId, queryClient, onSaved]);

  // --- Alternative Ingredient Selection ---

  const handleSelectAlternative = useCallback(
    async (
      ingredientId: number,
      ingredientName: string,
      ingredientSlug: string,
      _portionId: number | null,
      _measuringUnitId: number | null,
      _quantity: number,
    ) => {
      const targetItem = editItems.find((i) => i.id === alternativeTargetId);
      if (!targetItem) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/ingredients/${ingredientSlug}/portions/`, {
          credentials: 'include',
        });
        const portions = await res.json();

        // Use rank=1 (Normalportion) as the best portion for exchange groups
        const sortedPortions = [...portions].sort(
          (a: { rank?: number | null }, b: { rank?: number | null }) => (a.rank ?? 999) - (b.rank ?? 999),
        );
        const bestPortion = sortedPortions.find((p: { rank?: number | null; weight_g?: number | null }) =>
          p.rank === 1 && (p.weight_g ?? 0) > 0
        ) ?? sortedPortions[0] ?? portions[0];

        if (!bestPortion) {
          toast.error('Keine Portion für diese Zutat gefunden');
          return;
        }

        let groupId = targetItem.exchange_group_id;

        if (!groupId) {
          const group = await createExchangeGroup.mutateAsync('');
          groupId = group.id;

          await patchItem.mutateAsync({
            itemId: targetItem.id,
            data: { exchange_group_id: groupId, exchange_position: 0 },
          });
        }

        const existingPositions = editItems
          .filter((i) => i.exchange_group_id === groupId && i.id !== targetItem.id)
          .map((i) => i.exchange_position ?? 0);
        const nextPosition =
          existingPositions.length > 0 ? Math.max(...existingPositions) + 1 : 1;

        const maxSort = editItems.reduce((max, i) => Math.max(max, i.sort_order), 0);

        const alternativeWeightG = bestPortion.weight_g ?? 1;
        const isMetric = bestPortion.quantity === 1
          && BASE_METRIC_UNIT_NAMES.has(bestPortion.measuring_unit_name ?? 'g');
        const alternativeQuantity = isMetric ? alternativeWeightG : 1;
        const displayedAlternativeQuantity = scaleQuantity(alternativeQuantity, scale);
        const altKey = `ing-alt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setEditItems((prev) => [
          ...prev.map((i) =>
            i.id === targetItem.id && !i.exchange_group_id
              ? { ...i, exchange_group_id: groupId, exchange_position: 0 }
              : i,
          ),
          {
            id: -Date.now(),
            portion_id: bestPortion.id,
            ingredient_id: ingredientId,
            ingredient_name: ingredientName,
            quantity: displayedAlternativeQuantity,
            quantityInput: String(displayedAlternativeQuantity),
            measuring_unit_name: bestPortion.quantity !== 1 ? bestPortion.name : (bestPortion.measuring_unit_name || 'g'),
            note: '',
            sort_order: maxSort + 1,
            ingredient_portions: portions.map(
              (p: {
                id: number;
                name: string;
                quantity: number;
                weight_g: number | null;
                measuring_unit_name: string | null;
                rank?: number | null;
              }) => ({
                id: p.id,
                name: p.name,
                quantity: p.quantity,
                weight_g: p.weight_g,
                measuring_unit_name: p.measuring_unit_name,
                rank: p.rank ?? 999,
              }),
            ),
            is_optional: false,
            exchange_group_id: groupId,
            exchange_position: nextPosition,
            baseWeightG: alternativeWeightG,
            baseQuantity: 1,
            clientRequestId: altKey,
            isNew: true,
            isDirty: true,
          },
        ]);

        toast.success(`${ingredientName} als Alternative hinzugefügt`);
        setAlternativeTargetId(null);
      } catch (err) {
        toast.error('Fehler', { description: (err as Error).message });
      }
    },
    [alternativeTargetId, editItems, createExchangeGroup, patchItem],
  );

  // --- Save ---

  const performSave = useCallback(async (): Promise<boolean> => {
    if (saveInFlightRef.current) return saveInFlightRef.current;

    const savePromise = (async () => {
      setIsSaving(true);
      try {
      if (recipeId === null) {
        if (!onCreateDraft) {
          toast.error('Rezept konnte nicht angelegt werden');
          return false;
        }

        const draftItems: DraftIngredientItem[] = editItems
          .filter((item) => !item.isDeleted)
          .map((item) => {
            const requestKey = item.clientRequestId || `ingredient-${item.id}`;
            return {
              portion_id: item.portion_id,
              client_request_id: requestKey,
              idempotency_key: requestKey,
              quantity: toPersistedRecipeItemQuantity(item, scale),
              sort_order: item.sort_order,
              note: item.note,
              is_optional: item.is_optional,
            };
          });

        const created = await onCreateDraft(draftItems);
        if (created) {
          const createdItems = [...created.items].sort((a, b) => a.sort_order - b.sort_order);
          setEditItems((currentItems) => {
            let createdIndex = 0;
            return currentItems
              .filter((item) => !item.isDeleted)
              .map((item) => {
                const createdItem = createdItems[createdIndex];
                createdIndex += 1;
                return {
                  ...item,
                  id: createdItem?.id ?? item.id,
                  isNew: false,
                  isDirty: false,
                  aiExpectedGramsTotal: undefined,
                };
              });
          });
          onSave?.();
          onSaved();
          toast.success('Rezept angelegt');
        }
        return created !== null;
      }

      const promises: Promise<unknown>[] = [];
      const createdItems = new Map<number, RecipeItem>();

      // Delete removed items — PROTECT: toast specific message if in active plans
      for (const item of editItems.filter((i) => i.isDeleted && !i.isNew)) {
        promises.push(
          deleteItem.mutateAsync(item.id).catch((err: Error) => {
            if (err.message.includes('aktiven Essensplänen')) {
              toast.error('Löschen nicht möglich', {
                description: 'Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden.',
              });
              // Restore item as not-deleted
              setEditItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, isDeleted: false } : i)),
              );
              throw err;
            }
            throw err;
          }),
        );
      }

      // Create new items (convert metric grams to portion multiplier, keep non-metric portion count, then divide by scale)
      for (const item of editItems.filter((i) => i.isNew && !i.isDeleted)) {
        const requestKey = item.clientRequestId || `ingredient-${item.id}`;
        const promise = createItem
          .mutateAsync({
            portion_id: item.portion_id,
            client_request_id: requestKey,
            idempotency_key: requestKey,
            quantity: toPersistedRecipeItemQuantity(item, scale),
            sort_order: item.sort_order,
            note: item.note,
            is_optional: item.is_optional,
          })
          .then((createdItem) => {
            createdItems.set(item.id, createdItem);
            if (item.exchange_group_id != null) {
              return patchItem.mutateAsync({
                itemId: createdItem.id,
                data: {
                  exchange_group_id: item.exchange_group_id,
                  exchange_position: item.exchange_position,
                },
              });
            }
          });
        promises.push(promise);
      }

      // Update dirty existing items using the same unit-aware conversion as new items.
      for (const item of editItems.filter((i) => i.isDirty && !i.isNew && !i.isDeleted)) {
        promises.push(
          updateItem.mutateAsync({
            itemId: item.id,
            data: {
              portion_id: item.portion_id,
              quantity: toPersistedRecipeItemQuantity(item, scale),
              note: item.note,
              sort_order: item.sort_order,
              // Only present right after an AI estimate was applied to this
              // row — lets the backend verify the resulting gram amount
              // matches the AI's intent before persisting (safety net).
              ...(item.aiExpectedGramsTotal !== undefined
                ? { expected_grams_total: toBasePerServing(item.aiExpectedGramsTotal, scale) }
                : {}),
            },
          }),
        );
      }

      await Promise.all(promises);
      setEditItems((currentItems) =>
        currentItems
          .filter((item) => !item.isDeleted)
          .map((item) => {
            const createdItem = createdItems.get(item.id);
            return {
              ...item,
              id: createdItem?.id ?? item.id,
              isNew: false,
              isDirty: false,
              aiExpectedGramsTotal: undefined,
            };
          }),
      );
      toast.success('Änderungen gespeichert');
      onSave?.();
      onSaved();
      await queryClient.invalidateQueries({ queryKey: ['recipe', persistedRecipeId] });
      return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        toast.error('Fehler beim Speichern', { description: message });
        return false;
      } finally {
        setIsSaving(false);
      }
    })();
    saveInFlightRef.current = savePromise;
    try {
      return await savePromise;
    } finally {
      saveInFlightRef.current = null;
    }
  }, [editItems, portions, scale, deleteItem, createItem, updateItem, patchItem, onSave, onSaved, onCreateDraft, queryClient, recipeId, persistedRecipeId]);

  const confirmSave = useCallback(() => {
    setShowSaveConfirmation(false);
    const resolve = saveConfirmationRef.current;
    saveConfirmationRef.current = null;
    void performSave().then(resolve ?? (() => undefined));
  }, [performSave]);

  const cancelSave = useCallback(() => {
    setShowSaveConfirmation(false);
    const resolve = saveConfirmationRef.current;
    saveConfirmationRef.current = null;
    resolve?.(false);
  }, []);

  const handleSave = useCallback((): Promise<boolean> => {
    const pendingOperations = [...pendingIngredientOperationsRef.current];
    if (pendingOperations.length > 0) {
      if (pendingSaveAfterOperationsRef.current) return pendingSaveAfterOperationsRef.current;
      const deferredSave = Promise.all(pendingOperations).then(async () => {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        pendingSaveAfterOperationsRef.current = null;
        return latestHandleSaveRef.current();
      });
      pendingSaveAfterOperationsRef.current = deferredSave;
      return deferredSave;
    }
    if (recipeId === null && !editItems.some((item) => !item.isDeleted)) {
      toast.error('Füge mindestens eine Zutat hinzu');
      return Promise.resolve(false);
    }
    if (saveInFlightRef.current || saveConfirmationRef.current) {
      return Promise.resolve(false);
    }
    if (!editItems.some(
      (item) => item.isDirty === true || item.isNew === true || item.isDeleted === true,
    )) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      saveConfirmationRef.current = resolve;
      setShowSaveConfirmation(true);
    });
  }, [editItems, recipeId]);

  latestHandleSaveRef.current = handleSave;

  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

  // --- Render ---

  const activeItems = editItems.filter((i) => !i.isDeleted);

  return (
    <div className="space-y-4" data-testid="recipe-ingredient-editor">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        data-testid="recipe-serving-context-summary"
      >
        Gesamtmengen für <strong>{scale} {scale === 1 ? 'Person' : 'Personen'}</strong>. Beim Speichern werden sie auf
        eine Pro-Person-Menge normiert.
      </div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/50 border border-border rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Bearbeitungsmodus
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAiSuggest}
            disabled={isAiSuggesting}
            className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary"
            title="Weitere Zutaten per KI vorschlagen"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            {isAiSuggesting ? 'Lädt...' : 'Weitere Zutaten'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEstimate}
            disabled={estimateQuantities.isPending}
            className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary"
            data-testid="ai-estimate-trigger"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">auto_fix_high</span>
            {estimateQuantities.isPending ? 'Schätze...' : 'Mengen schätzen'}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} data-testid="ingredient-editor-save">
            <span className="material-symbols-outlined text-[16px] mr-1.5">save</span>
            {isSaving ? 'Speichert...' : 'Speichern'}
          </Button>
      <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showSaveConfirmation}
        onConfirm={confirmSave}
        onCancel={cancelSave}
        variant="default"
        title={`Mengen für ${scale} ${scale === 1 ? 'Person' : 'Personen'} speichern?`}
        description={`Die eingegebenen Gesamtmengen gelten für ${scale} ${scale === 1 ? 'Person' : 'Personen'} und werden intern auf Pro-1-Person-Mengen normiert.`}
        confirmLabel="Speichern"
      />

      {/* Ingredient Rows */}
      <div className="space-y-2">
        {(() => {
          const standaloneItems = activeItems.filter(item => item.exchange_group_id == null);
          const exchangeSources = activeItems.filter(
            item => item.exchange_group_id != null && item.exchange_position === 0
          );

          // Combine standalone items and exchange-group "source" rows into a
          // single list, sorted descending by weight — alternatives stay
          // nested under their source row (see rendering below).
          const topLevelItems = [...standaloneItems, ...exchangeSources].sort(
            (a, b) => getItemWeightG(b) - getItemWeightG(a),
          );

          const renderRow = (item: EditableItem, isSource: boolean, isAlt: boolean, isLastInGroup: boolean) => (
            <IngredientRow
              key={item.id}
              item={item}
              isSource={isSource}
              isAlt={isAlt}
              isLastInGroup={isLastInGroup}
              editItems={editItems}
              expandedNotes={expandedNotes}
              setExpandedNotes={setExpandedNotes}
              handleQuantityInputChange={handleQuantityInputChange}
              handleQuantityBlur={handleQuantityBlur}
              handlePortionChange={handlePortionChange}
              handleNoteChange={handleNoteChange}
              handleDelete={handleDelete}
              setAlternativeTargetId={setAlternativeTargetId}
              patchItem={patchItem}
              setEditItems={setEditItems}
              user={user ?? undefined}
            />
          );

          const rendered: ReactNode[] = topLevelItems.map((item) => {
            if (item.exchange_group_id == null) {
              return renderRow(item, false, false, true);
            }
            // Exchange group: source + alternatives grouped together
            const alts = activeItems.filter(
              (other) =>
                other.exchange_group_id === item.exchange_group_id &&
                (other.exchange_position ?? 0) > 0,
            );
            return (
              <div key={`group-${item.id}`} className="space-y-0">
                {renderRow(item, true, false, alts.length === 0)}
                {alts.map((alt, idx) =>
                  renderRow(alt, false, true, idx === alts.length - 1),
                )}
              </div>
            );
          });

          return rendered;
        })()}
      </div>

      {/* Add Ingredient */}
      <div className="pt-2 border-t flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <IngredientAutocomplete
            value={inputValue}
            onChange={setInputValue}
            onSelect={(ingredient) => {
              trackIngredientOperation(handleAddIngredient(ingredient));
              setInputValue('');
            }}
            onCreateNew={(name) => {
              const currentUrl = `${window.location.pathname}${window.location.search}`;
              navigate(`/ingredients/new?prefillName=${encodeURIComponent(name)}&redirectTo=${encodeURIComponent(currentUrl)}`);
              setInputValue('');
            }}
            placeholder="Zutat hinzufügen..."
          />
        </div>
        <button
          type="button"
          onClick={() => setDetailSearchOpen(true)}
          className="h-11 self-start px-3 rounded-lg border border-input hover:bg-muted hover:border-primary/40 transition-colors text-muted-foreground hover:text-primary shrink-0"
          title="Detailsuche"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Ingredient Detail Search Dialog */}
      <IngredientDetailSearchDialog
        open={detailSearchOpen}
        onOpenChange={setDetailSearchOpen}
        onSelect={handleAddFromDialog}
      />

      {/* Alternative Ingredient Search Dialog */}
      <IngredientDetailSearchDialog
        open={alternativeTargetId !== null}
        onOpenChange={(open) => { if (!open) setAlternativeTargetId(null); }}
        onSelect={handleSelectAlternative}
        showQuantityDialog={false}
      />

      {/* AI Estimate Preview Dialog */}
      {showEstimate && estimateResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 mx-4 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">auto_fix_high</span>
              AI-Mengenschätzung
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Geschätzte Mengen pro Person:
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedEstimates.size === estimateResult.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEstimates(new Set(estimateResult.map((est) => est.item_id)));
                        } else {
                          setSelectedEstimates(new Set());
                        }
                      }}
                      className="rounded border-input"
                      title="Alle auswählen"
                    />
                  </th>
                  <th className="pb-2">Zutat</th>
                  <th className="pb-2 text-right">Alt</th>
                  <th className="pb-2 text-right">Neu</th>
                </tr>
              </thead>
              <tbody>
                {estimateResult.map((est) => {
                  const currentItem = editItems.find((i) => i.id === est.item_id);
                  const currentItemGrams = currentItem ? getItemWeightG(currentItem) : 0;
                  // Primary: always the plain gram amount (unambiguous, no
                  // "0.01 Gramm (1g)"-style confusion). Secondary: the portion
                  // context in parentheses, only shown when the portion isn't
                  // itself a plain gram unit (e.g. "0,8 × 100g Linsen (rot)").
                  const altPortionContext =
                    currentItem && currentItem.quantity > 0 && currentItem.measuring_unit_name
                      ? ` (${currentItem.quantity} ${currentItem.measuring_unit_name})`
                      : '';
                  const altValue = currentItem && currentItemGrams > 0
                    ? `${formatGramsShort(currentItemGrams)}${altPortionContext}`
                    : '—';
                  const newPortionContext = est.unit && est.unit !== 'g' && est.unit !== 'Gramm'
                    ? ` (${est.quantity_per_portion} ${est.unit})`
                    : '';
                  const newValue = `${formatGramsShort(est.grams_total)}${newPortionContext}`;
                  const hasChange = !currentItem || Math.abs(currentItemGrams - est.grams_total) > 0.05;
                  return (
                    <tr
                      key={est.item_id}
                      className={`border-b last:border-0 ${hasChange ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selectedEstimates.has(est.item_id)}
                          onChange={(e) => {
                            setSelectedEstimates((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                next.add(est.item_id);
                              } else {
                                next.delete(est.item_id);
                              }
                              return next;
                            });
                          }}
                          className="rounded border-input"
                        />
                      </td>
                      <td className="py-2">{est.ingredient_name}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {altValue}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {newValue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEstimate(false);
                  setEstimateResult(null);
                  setSelectedEstimates(new Set());
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Verwerfen
              </button>
              <button
                type="button"
                onClick={handleApplyEstimate}
                disabled={selectedEstimates.size === 0}
                data-testid="ai-estimate-apply"
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Übernehmen ({selectedEstimates.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions Confirmation Dialog */}
      {aiSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 mx-4 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              KI-Vorschläge
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Folgende Zutaten wurden vorgeschlagen:
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedAiSuggestions.size === aiSuggestions.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAiSuggestions(new Set(aiSuggestions.map((_, i) => i)));
                        } else {
                          setSelectedAiSuggestions(new Set());
                        }
                      }}
                      className="rounded border-input"
                      title="Alle auswählen"
                    />
                  </th>
                  <th className="pb-2">Zutat</th>
                  <th className="pb-2 text-right">Menge</th>
                </tr>
              </thead>
              <tbody>
                {aiSuggestions.map((s, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selectedAiSuggestions.has(i)}
                        onChange={(e) => {
                          setSelectedAiSuggestions((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              next.add(i);
                            } else {
                              next.delete(i);
                            }
                            return next;
                          });
                        }}
                        className="rounded border-input"
                      />
                    </td>
                    <td className="py-2 font-medium">{s.ingredient_name}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {s.quantity} {s.portion_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-6">
              {aiSuggestInteractionId && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Hilfreich?</span>
                  <AiVoteButtons interactionId={aiSuggestInteractionId} />
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAiSuggestions(null);
                    setSelectedAiSuggestions(new Set());
                    setAiSuggestInteractionId(null);
                  }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
                >
                  Verwerfen
                </button>
                <button
                  type="button"
                  onClick={handleApplyAiSuggestions}
                  disabled={selectedAiSuggestions.size === 0}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Übernehmen ({selectedAiSuggestions.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scale Dialog */}
    </div>
  );
});

export default InlineIngredientEditor;
