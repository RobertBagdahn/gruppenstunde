/**
 * InlineIngredientEditor — Edit-Mode for recipe ingredients on the detail page.
 * Allows editing quantities, units, notes, adding/removing items, and AI estimation.
 */
import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import {
  useUpdateRecipe,
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
import PortionScaler from './PortionScaler';
import { scaleQuantity, toBasePerServing, rescaleForNewPortions } from '@/lib/cookingQuantityScale';
import { AiVoteButtons } from '@/components/shared/AiVoteButtons';
import { Button } from '@/components/ui/button';
import type { RecipeItem } from '@/schemas/recipe';
import type { EstimateQuantityItem } from '@/schemas/recipe';

// --- Types ---

interface EditableItem {
  id: number;
  portion_id: number;
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
  isNew?: boolean;
  isDeleted?: boolean;
  isDirty?: boolean;
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
  recipeId: number;
  recipeSlug: string;
  items: RecipeItem[];
  portions: number | null;
  /** Initial number of persons to edit quantities for (e.g. the detail page's
   *  current display multiplier). Quantities are shown scaled by this factor
   *  and can be changed freely inside the editor. On save, values are divided
   *  by the (possibly changed) factor before sending to the API. This allows
   *  editing in familiar cooking quantities (e.g. "for 4 people"). */
  initialEditPortions?: number;
  /** Called after successful save. In the Wizard, this can trigger navigation. */
  onSave?: () => void;
  onClose: () => void;
  onSaved: () => void;
}

// --- Helpers ---

/** Normalize items to per-1-serving quantities in grams.
 *  Converts portion-based quantities to grams for editing,
 *  and switches to the rank=1 (Normalportion) portion.
 *
 *  CRITICAL LABELING RULE (fix for recipe #434 bug):
 *  ================================================
 *  Portions fall into two categories by their `quantity` field:
 *
 *  1. Composite portions (quantity !== 1):
 *     Example: "1 Portion Nudeln" (quantity=125, weight_g=125, measuring_unit="Gramm")
 *     These are pre-scaled portions. The quantity field is a CONVERSION FACTOR,
 *     not a count. The label MUST be the portion's own name ("1 Portion Nudeln"),
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

function normalizeItems(items: RecipeItem[], portions: number | null): EditableItem[] {
  const s = portions ?? 1;
  return items.map((item) => {
    // Find the weight_g of the current portion
    const currentPortion = item.ingredient_portions?.find((p) => p.id === item.portion_id);
    const portionWeightG = currentPortion?.weight_g ?? 1;

    // Convert to grams: quantity × portion.weight_g
    const quantityInGrams = item.quantity * portionWeightG;
    const normalizedQty = s > 1 ? Math.round((quantityInGrams / s) * 100) / 100 : quantityInGrams;

    // Quantity as multiplier on the ORIGINAL (saved) portion
    // This ensures save path always works correctly: toBasePerServing(qty, scale) produces right results
    const quantityForOriginalPortion = portionWeightG > 0 
      ? Math.round((normalizedQty / portionWeightG) * 100) / 100 
      : normalizedQty;
    const qty = quantityForOriginalPortion;
    
    // Label: prefer rank=1 portion name only if it has a meaningful weight_g
    // This improves UX by showing nice labels like "100g Würstchen" or "1 Portion Nudeln"
    // but avoids confusing labels like "n. B." (nach Bedarf / as needed)
    // (while keeping quantity multipliers based on original saved portion)
    const sortedPortions = [...(item.ingredient_portions ?? [])].sort((a, b) => a.rank - b.rank);
    const rank1Portion = sortedPortions.find((p) => p.rank === 1);
    // Use rank=1 name only if it has meaningful weight_g and quantity info
    const shouldUseRank1Label = rank1Portion && 
      rank1Portion.weight_g !== null && 
      rank1Portion.weight_g !== undefined &&
      (rank1Portion.quantity !== 1 || rank1Portion.weight_g !== currentPortion?.weight_g);
    const label = shouldUseRank1Label && rank1Portion
      ? rank1Portion.name
      : currentPortion?.measuring_unit_name ?? 'g';
    
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
      // Only mark dirty if portions changed by user action (s > 1)
      isDirty: s > 1,
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
        className="w-20 px-2 py-1.5 text-sm text-right border rounded-md"
      />
      {item.ingredient_portions.length > 1 ? (
        <select
          value={item.portion_id}
          onChange={(e) => handlePortionChange(item.id, parseInt(e.target.value))}
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

export default function InlineIngredientEditor({
  recipeId,
  recipeSlug,
  items,
  portions,
  initialEditPortions = 1,
  onSave,
  onClose,
  onSaved,
}: InlineIngredientEditorProps) {
  void recipeSlug; // used by Wizard context for future data fetching
  const [editPortions, setEditPortions] = useState(() =>
    initialEditPortions > 0 ? initialEditPortions : 1,
  );
  const scale = editPortions > 1 ? editPortions : 1;

  const [editItems, setEditItems] = useState<EditableItem[]>(() => {
    const normalized = normalizeItems(items, portions);
    // If the initial person count > 1, scale up all quantities for display
    if (scale > 1) {
      return normalized.map((item) => ({
        ...item,
        quantity: scaleQuantity(item.quantity, scale),
        quantityInput: String(scaleQuantity(item.quantity, scale)),
      }));
    }
    return normalized;
  });
  const [showEstimate, setShowEstimate] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [estimateResult, setEstimateResult] = useState<EstimateQuantityItem[] | null>(null);
  const [selectedEstimates, setSelectedEstimates] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
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

  const updateRecipe = useUpdateRecipe(recipeId);
  const updateItem = useUpdateRecipeItem(recipeId);
  const deleteItem = useDeleteRecipeItem(recipeId);
  const createItem = useCreateRecipeItem(recipeId);
  const estimateQuantities = useEstimateQuantities(recipeId);
  const patchItem = usePatchRecipeItem(recipeId);
  const createExchangeGroup = useCreateExchangeGroup(recipeId);

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
          ? { ...item, quantityInput: raw, quantity: isValid ? parsed : item.quantity, isDirty: true }
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
        const oldPortion = item.ingredient_portions.find((p) => p.id === item.portion_id);
        const newPortion = item.ingredient_portions.find((p) => p.id === portionId);
        if (!newPortion) return item;

        // Convert quantity: old quantity in grams → new unit. Prefer the
        // reliable baseWeightG/baseQuantity ratio over the portion lookup —
        // `oldPortion` can be undefined if `portion_id` isn't present in this
        // item's own `ingredient_portions` list (seen in the wild), which
        // would otherwise silently fall back to a wrong "1g" default.
        const oldWeightG = item.baseQuantity > 0
          ? item.baseWeightG / item.baseQuantity
          : (oldPortion?.weight_g ?? 1);
        const newWeightG = newPortion.weight_g ?? 1;
        const quantityInGrams = item.quantity * oldWeightG;
        const newQuantity = Math.round((quantityInGrams / newWeightG) * 100) / 100;

        // Use the same composite-portion label rule as normalizeItems()
        const label = newPortion.quantity !== 1
          ? newPortion.name
          : newPortion.measuring_unit_name ?? 'g';

        return {
          ...item,
          portion_id: portionId,
          measuring_unit_name: label,
          quantity: newQuantity,
          quantityInput: String(newQuantity),
          // Keep the grams-per-unit ratio consistent with the new portion.
          baseWeightG: quantityInGrams,
          baseQuantity: newQuantity,
          isDirty: true,
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
        const res = await fetch(`/api/ingredients/${ingredient.slug}/portions/`, { credentials: 'include' });
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
        
        setEditItems((prev) => [
          ...prev,
          {
            id: -Date.now(),
            portion_id: bestPortion.id,
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            quantity: 1, // (4.2) start with 1, not 0
            quantityInput: '1',
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawSlug = params.get('newIngredientSlug');
    if (!rawSlug) return;

    const newSlug = rawSlug;
    let cancelled = false;

    async function handle() {
      try {
        const res = await fetch(`/api/ingredients/${encodeURIComponent(newSlug)}/`, { credentials: 'include' });
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
        const res = await fetch(`/api/ingredients/${ingredientSlug}/portions/`, { credentials: 'include' });
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
        
        setEditItems((prev) => [
          ...prev,
          {
            id: -Date.now(),
            portion_id: selectedPortion!.id,
            ingredient_id: ingredientId,
            ingredient_name: ingredientName,
            quantity,
            quantityInput: String(quantity),
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
            baseWeightG: (selectedPortion!.weight_g ?? 0) * quantity,
            baseQuantity: quantity,
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
        if (estimate) {
          return { ...item, quantity: estimate.quantity_per_portion, quantityInput: String(estimate.quantity_per_portion), isDirty: true };
        }
        return item;
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
      const suggestRes = await fetch(`/api/recipes/${recipeId}/ai-suggest-ingredients/`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!suggestRes.ok) throw new Error('Vorschläge fehlgeschlagen');
      const data = await suggestRes.json();

      // Support both list response (legacy) and object response with interaction_id
      const suggestions: AiIngredientSuggestion[] = Array.isArray(data) ? data : (data.suggestions ?? data);
      const interactionId: string | null = !Array.isArray(data) ? (data.ai_interaction_id ?? null) : null;

      if (!suggestions || suggestions.length === 0) {
        toast.info('Keine weiteren Zutaten vorgeschlagen');
        return;
      }

      setAiSuggestions(suggestions);
      setSelectedAiSuggestions(new Set(suggestions.map((_, i) => i)));
      setAiSuggestInteractionId(interactionId);
    } catch {
      toast.error('KI-Vorschläge konnten nicht generiert werden');
    } finally {
      setIsAiSuggesting(false);
    }
  }, [recipeId]);

  const handleApplyAiSuggestions = useCallback(async () => {
    if (!aiSuggestions || selectedAiSuggestions.size === 0) return;

    const selected = aiSuggestions.filter((_, i) => selectedAiSuggestions.has(i));
    try {
      const applyRes = await fetch(`/api/recipes/${recipeId}/ai-apply-ingredients/`, {
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

  // --- Person count (cooking-quantity editing) ---

  // Changes how many people the displayed quantities are scaled for.
  // Re-derives each item's per-1-serving base from the current display value
  // (using the previous scale), then re-applies the new scale — so manual
  // edits made at the previous person count are preserved proportionally.
  const handleEditPortionsChange = useCallback(
    (newPortions: number) => {
      const clamped = Math.max(1, newPortions);
      setEditItems((prev) =>
        prev.map((item) => {
          const newQty = rescaleForNewPortions(item.quantity, scale, clamped);
          return { ...item, quantity: newQty, quantityInput: String(newQty) };
        }),
      );
      setEditPortions(clamped);
    },
    [scale],
  );


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
        const res = await fetch(`/api/ingredients/${ingredientSlug}/portions/`, {
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
            quantity: 1,
            quantityInput: '1',
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
            baseWeightG: bestPortion.weight_g ?? 0,
            baseQuantity: 1,
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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      // Always set servings to 1 (quantities are per-serving)
      if ((portions ?? 1) !== 1) {
        promises.push(updateRecipe.mutateAsync({ portions: 1 }));
      }

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

      // Create new items (divide by scale to store per-1-portion value)
      for (const item of editItems.filter((i) => i.isNew && !i.isDeleted)) {
        const promise = createItem
          .mutateAsync({
            portion_id: item.portion_id,
            quantity: toBasePerServing(item.quantity, scale),
            sort_order: item.sort_order,
            note: item.note,
            is_optional: item.is_optional,
          })
          .then((createdItem) => {
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

      // Update dirty existing items (divide by scale to store per-1-portion value)
      for (const item of editItems.filter((i) => i.isDirty && !i.isNew && !i.isDeleted)) {
        promises.push(
          updateItem.mutateAsync({
            itemId: item.id,
            data: {
              portion_id: item.portion_id,
              quantity: toBasePerServing(item.quantity, scale),
              note: item.note,
              sort_order: item.sort_order,
            },
          }),
        );
      }

      await Promise.all(promises);
      toast.success('Änderungen gespeichert');
      onSave?.();
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error('Fehler beim Speichern', { description: message });
    } finally {
      setIsSaving(false);
    }
  }, [editItems, portions, scale, updateRecipe, deleteItem, createItem, updateItem, patchItem, onSaved]);

  // --- Render ---

  const activeItems = editItems.filter((i) => !i.isDeleted);

  return (
    <div className="space-y-4">
      {/* Person-count selector for cooking-quantity editing */}
      <div className="space-y-1">
        <PortionScaler
          value={editPortions}
          min={1}
          max={100}
          compact
          onChange={handleEditPortionsChange}
        />
        <p className="px-1 text-xs text-amber-800">
          Mengen für <strong>{editPortions} {editPortions === 1 ? 'Person' : 'Personen'}</strong> — werden beim
          Speichern auf 1 Portion normiert.
        </p>
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
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">auto_fix_high</span>
            {estimateQuantities.isPending ? 'Schätze...' : 'Mengen schätzen'}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">save</span>
            {isSaving ? 'Speichert...' : 'Speichern'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </div>

      {/* Ingredient Rows */}
      <div className="space-y-2">
        {(() => {
          // Weight (in grams) of an item — used to sort the list descending by
          // weight, matching the read-only view (`IngredientList`). Recomputed
          // live so the order always reflects the current (possibly just-edited)
          // quantity. Uses the backend-computed `baseWeightG`/`baseQuantity`
          // ratio rather than looking up `ingredient_portions[].weight_g` by
          // `portion_id` — that lookup can silently return nothing (and fall
          // back to a wrong default) when `portion_id` isn't present in the
          // item's own `ingredient_portions` list.
          const getItemWeightG = (item: EditableItem) => {
            if (item.baseQuantity > 0) {
              return (item.baseWeightG / item.baseQuantity) * item.quantity;
            }
            const portion = item.ingredient_portions.find((p) => p.id === item.portion_id);
            return item.quantity * (portion?.weight_g ?? 0);
          };

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
      <div className="pt-2 border-t flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <IngredientAutocomplete
            value={inputValue}
            onChange={setInputValue}
            onSelect={(ingredient) => {
              handleAddIngredient(ingredient);
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
          className="h-11 px-3 rounded-lg border border-input hover:bg-muted hover:border-primary/40 transition-colors text-muted-foreground hover:text-primary shrink-0"
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
                  const currentPortion = currentItem?.ingredient_portions.find(
                    (p) => p.id === currentItem.portion_id,
                  );
                  const altGramsText =
                    currentItem && currentItem.quantity > 0 && currentPortion?.weight_g != null
                      ? ` (${formatGramsShort(currentItem.quantity * currentPortion.weight_g)})`
                      : '';
                  const altValue = currentItem && currentItem.quantity > 0
                    ? `${currentItem.quantity} ${currentItem.measuring_unit_name || 'g'}${altGramsText}`
                    : '—';
                  const hasChange = !currentItem || currentItem.quantity !== est.quantity_per_portion;
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
                        {est.quantity_per_portion} {est.unit} ({formatGramsShort(est.grams_total)})
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
}
