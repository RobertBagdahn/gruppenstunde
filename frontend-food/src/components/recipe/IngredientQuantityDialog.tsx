import { useMemo, useState } from 'react';
import { Egg } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PortionPicker, { type PickerStandardMeasure } from './PortionPicker';
import { useStandardMeasures } from '@/api/supplies';
import { standardMeasureLabel } from '@/lib/quantityUnits';
import { LIQUID_VISCOSITIES, type Portion } from '@/schemas/supply';
import { formatExactWeight, formatNumber } from '@/lib/format';
import { formatDecimalInput, parseDecimalInput } from '@/lib/decimalInput';
import { QUANTITY_COUNT_MAX } from '@/lib/mealPlanBounds';

interface IngredientQuantityDialogProps {
  ingredient: {
    id: number;
    name: string;
    slug: string;
    portions: Portion[];
    /** Density in g/ml; only used for liquids to offer milliliters. */
    physical_density?: number | null;
    physical_viscosity?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `standardMeasure` is only set with `keepStandardMeasure`: then `quantity`
   *  counts that measure and `portionId` is the ingredient's "g" portion. */
  onConfirm: (
    portionId: number | null,
    measuringUnitId: number | null,
    quantity: number,
    standardMeasure?: PickerStandardMeasure | null,
  ) => void;
  initialQuantity?: number;
  /** Portion to preselect (e.g. the one already chosen for a review row). */
  initialPortionId?: number | null;
  /** Standard measure (el, tl, …) to preselect; then `initialQuantity` counts that measure. */
  initialStandardKey?: string | null;
  confirmLabel?: string;
  /** Keep a chosen standard measure (EL, Tasse, …) as the unit instead of
   *  converting it to grams. Only for callers that can store it. */
  keepStandardMeasure?: boolean;
}

function findGramPortion(portions: Portion[]): Portion | null {
  return (
    portions.find((p) => {
      const name = (p.name || '').toLowerCase();
      const unit = (p.measuring_unit_name || '').toLowerCase();
      return p.weight_g === 1 && p.quantity === 1 && (name === 'g' || unit === 'g' || unit === 'gramm');
    }) ?? null
  );
}

export default function IngredientQuantityDialog({
  ingredient,
  open,
  onOpenChange,
  onConfirm,
  initialQuantity = 1,
  initialPortionId = null,
  initialStandardKey = null,
  confirmLabel = 'Hinzufügen',
  keepStandardMeasure = false,
}: IngredientQuantityDialogProps) {
  const { data: standardMeasures = [] } = useStandardMeasures(ingredient.slug);
  // rank=1 is the Normalportion/default; portions are sorted by rank asc from backend
  const gramPortion = useMemo(() => findGramPortion(ingredient.portions), [ingredient.portions]);
  const defaultPortion = useMemo(
    () =>
      ingredient.portions.find((p) => p.id === initialPortionId)
      ?? ingredient.portions.find((p) => p.rank === 1)
      ?? ingredient.portions[0]
      ?? null,
    [ingredient.portions, initialPortionId],
  );

  // A preselected standard measure counts on the gram portion, like a fresh pick.
  const initialMeasureOnGramPortion = initialStandardKey && gramPortion ? gramPortion : null;

  // null = direct gram entry
  const [selectedPortionId, setSelectedPortionId] = useState<string | null>(
    initialMeasureOnGramPortion
      ? String(initialMeasureOnGramPortion.id)
      : defaultPortion ? String(defaultPortion.id) : null,
  );
  const [quantityInput, setQuantityInput] = useState(() =>
    formatDecimalInput(initialQuantity > 0 ? initialQuantity : 1),
  );
  const quantity = parseDecimalInput(quantityInput);
  const validQuantity = quantity !== null && quantity >= 0.1 && quantity <= QUANTITY_COUNT_MAX ? quantity : null;

  // Milliliter entry for liquids: the quantity counts ml, converted with the density.
  const [isMilliliterMode, setIsMilliliterMode] = useState(false);

  const density = ingredient.physical_density ?? null;
  const canUseMilliliters =
    gramPortion !== null
    && LIQUID_VISCOSITIES.has(ingredient.physical_viscosity ?? '')
    && density !== null
    && density > 0;
  // Stored as key: the measure's weight comes from the catalog once it has loaded.
  const [selectedMeasureKey, setSelectedMeasureKey] = useState<string | null>(
    initialMeasureOnGramPortion ? initialStandardKey ?? null : null,
  );
  const selectedMeasure: PickerStandardMeasure | null = selectedMeasureKey
    ? standardMeasures.find((measure) => measure.key === selectedMeasureKey) ?? null
    : null;
  // A chosen measure that the catalog does not know yet (still loading) must block confirmation:
  // otherwise its count would be saved as grams.
  const standardMeasurePending = selectedMeasureKey !== null && selectedMeasure === null;

  const selectedPortion = ingredient.portions.find(
    (p) => String(p.id) === selectedPortionId,
  ) ?? null;

  const milliliterWeightG = isMilliliterMode && density && validQuantity !== null
    ? validQuantity * density
    : null;
  const unitWeightG = selectedMeasure ? selectedMeasure.grams : selectedPortion?.weight_g ?? null;
  const totalWeightG = milliliterWeightG ?? (unitWeightG && validQuantity !== null ? validQuantity * unitWeightG : null);

  const handleSelectStandardMeasure = (measure: PickerStandardMeasure) => {
    if (!gramPortion) return;
    setIsMilliliterMode(false);
    if (keepStandardMeasure) {
      // Gram-preserving count of the measure; one measure when the weight is unknown.
      const count = totalWeightG && measure.grams > 0
        ? Math.max(Math.round((totalWeightG / measure.grams) * 100) / 100, 0.1)
        : 1;
      setSelectedPortionId(String(gramPortion.id));
      setSelectedMeasureKey(measure.key);
      setQuantityInput(formatDecimalInput(count));
      return;
    }
    setSelectedPortionId(String(gramPortion.id));
    setQuantityInput(formatDecimalInput(measure.grams));
  };

  const handleSelectPortion = (portionId: number) => {
    setSelectedMeasureKey(null);
    setIsMilliliterMode(false);
    setSelectedPortionId(String(portionId));
  };

  const handleSelectGrams = () => {
    setSelectedMeasureKey(null);
    setIsMilliliterMode(false);
    if (gramPortion) setSelectedPortionId(String(gramPortion.id));
  };

  // Switching to milliliters keeps the current weight: 1 ml counts as 1 g × density.
  const handleSelectMilliliters = () => {
    if (!gramPortion || !density) return;
    setSelectedMeasureKey(null);
    if (totalWeightG && totalWeightG > 0) {
      setQuantityInput(formatDecimalInput(Math.round(totalWeightG / density)));
    }
    setIsMilliliterMode(true);
    setSelectedPortionId(String(gramPortion.id));
  };

  // A confirmed quantity always belongs to a concrete portion — grams map to the
  // ingredient's gram portion, never to "whatever is first". Milliliters are
  // confirmed as grams on that gram portion.
  const handleConfirm = () => {
    if (!selectedPortion || validQuantity === null || standardMeasurePending) return;
    const measuringUnitId = selectedPortion.measuring_unit_id ?? null;
    if (isMilliliterMode) {
      if (!gramPortion || milliliterWeightG === null) return;
      onConfirm(gramPortion.id, gramPortion.measuring_unit_id ?? null, Math.round(milliliterWeightG * 100) / 100);
      return;
    }
    if (selectedMeasure) {
      onConfirm(selectedPortion.id, measuringUnitId, validQuantity, selectedMeasure);
    } else {
      onConfirm(selectedPortion.id, measuringUnitId, validQuantity);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-section font-display">
            <Egg className="w-5 h-5 text-primary" />
            {ingredient.name} hinzufügen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="ingredient-quantity" className="text-body font-medium">Menge</label>
            <input
              id="ingredient-quantity"
              type="text"
              inputMode="decimal"
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              aria-invalid={validQuantity === null}
              className="w-full mt-1 rounded-lg border px-3 py-2.5 text-emphasis focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {ingredient.portions.length === 0 && (
            <p className="text-caption text-warning">
              Für diese Zutat gibt es noch keine Portion. Lege zuerst eine Portion an.
            </p>
          )}

          {ingredient.portions.length > 0 && (
            <div>
              <label className="text-body font-medium">Einheit</label>
              <div className="mt-1">
                <PortionPicker
                  portions={ingredient.portions.map((p) => ({
                    id: p.id,
                    name: p.name,
                    quantity: p.quantity,
                    weight_g: p.weight_g,
                    measuring_unit_name: p.measuring_unit_name,
                    rank: p.rank,
                    is_weight_trusted: p.is_weight_trusted,
                  }))}
                  value={selectedPortionId != null ? Number(selectedPortionId) : null}
                  selectedStandardKey={selectedMeasure?.key ?? null}
                  // Grams and standard measures need the ingredient's gram portion.
                  ingredientSlug={gramPortion ? ingredient.slug : undefined}
                  showGramsSection={gramPortion !== null}
                  showMilliliterSection={canUseMilliliters}
                  isMilliliterSelected={isMilliliterMode}
                  milliliterDensity={density}
                  onSelectPortion={handleSelectPortion}
                  onSelectStandardMeasure={handleSelectStandardMeasure}
                  onSelectGrams={handleSelectGrams}
                  onSelectMilliliters={handleSelectMilliliters}
                />
              </div>
            </div>
          )}

          {isMilliliterMode && density && validQuantity !== null && totalWeightG !== null && (
            <p className="text-caption text-muted-foreground">
              {formatNumber(validQuantity, { maxDecimals: 2 })} ml × {formatNumber(density, { maxDecimals: 2 })} g/ml = {formatExactWeight(totalWeightG)}
            </p>
          )}

          {!isMilliliterMode && totalWeightG && unitWeightG && (
            <p className="text-caption text-muted-foreground">
              {validQuantity} × {selectedMeasure ? `${standardMeasureLabel(selectedMeasure.key)} (${formatExactWeight(unitWeightG)})` : formatExactWeight(unitWeightG)}
              {' '}= {selectedMeasure?.is_approx ? '≈ ' : ''}{formatExactWeight(totalWeightG)}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-body rounded-lg border hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPortion || validQuantity === null || standardMeasurePending}
              className="px-4 py-2 text-body rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
