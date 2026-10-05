import { useMemo, useState } from 'react';
import { Egg } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PortionPicker, { type PickerStandardMeasure } from './PortionPicker';
import type { Portion } from '@/schemas/supply';
import { formatExactWeight, formatWeight } from '@/lib/format';
import { formatDecimalInput, parseDecimalInput } from '@/lib/decimalInput';

interface IngredientQuantityDialogProps {
  ingredient: { id: number; name: string; slug: string; portions: Portion[] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  initialQuantity?: number;
  /** Portion to preselect (e.g. the one already chosen for a review row). */
  initialPortionId?: number | null;
  confirmLabel?: string;
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
  confirmLabel = 'Hinzufügen',
}: IngredientQuantityDialogProps) {
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

  // null = direct gram entry
  const [selectedPortionId, setSelectedPortionId] = useState<string | null>(
    defaultPortion ? String(defaultPortion.id) : null,
  );
  const [quantityInput, setQuantityInput] = useState(() =>
    formatDecimalInput(initialQuantity > 0 ? initialQuantity : 1),
  );
  const quantity = parseDecimalInput(quantityInput);
  const validQuantity = quantity !== null && quantity >= 0.1 ? quantity : null;

  const selectedPortion = ingredient.portions.find(
    (p) => String(p.id) === selectedPortionId,
  ) ?? null;

  const totalWeightG = selectedPortion?.weight_g && validQuantity !== null
    ? validQuantity * selectedPortion.weight_g
    : null;

  const handleSelectStandardMeasure = (measure: PickerStandardMeasure) => {
    if (!gramPortion) return;
    setSelectedPortionId(String(gramPortion.id));
    setQuantityInput(formatDecimalInput(measure.grams));
  };

  const handleSelectGrams = () => {
    if (gramPortion) setSelectedPortionId(String(gramPortion.id));
  };

  // A confirmed quantity always belongs to a concrete portion — grams map to the
  // ingredient's gram portion, never to "whatever is first".
  const handleConfirm = () => {
    if (!selectedPortion || validQuantity === null) return;
    onConfirm(selectedPortion.id, selectedPortion.measuring_unit_id ?? null, validQuantity);
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
                  // Grams and standard measures need the ingredient's gram portion.
                  ingredientSlug={gramPortion ? ingredient.slug : undefined}
                  showGramsSection={gramPortion !== null}
                  onSelectPortion={(portionId) => setSelectedPortionId(String(portionId))}
                  onSelectStandardMeasure={handleSelectStandardMeasure}
                  onSelectGrams={handleSelectGrams}
                />
              </div>
            </div>
          )}

          {totalWeightG && selectedPortion?.weight_g && (
            <p className="text-caption text-muted-foreground">
              {validQuantity} × {formatExactWeight(selectedPortion.weight_g)} = {formatWeight(totalWeightG)}
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
              disabled={!selectedPortion || validQuantity === null}
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
