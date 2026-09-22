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

interface IngredientQuantityDialogProps {
  ingredient: { id: number; name: string; slug: string; portions: Portion[] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  initialQuantity?: number;
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
  confirmLabel = 'Hinzufügen',
}: IngredientQuantityDialogProps) {
  // rank=1 is the Normalportion/default; portions are sorted by rank asc from backend
  const gramPortion = useMemo(() => findGramPortion(ingredient.portions), [ingredient.portions]);
  const defaultPortion = useMemo(
    () => ingredient.portions.find((p) => p.rank === 1) ?? ingredient.portions[0] ?? null,
    [ingredient.portions],
  );

  // null = direct gram entry
  const [selectedPortionId, setSelectedPortionId] = useState<string | null>(
    defaultPortion ? String(defaultPortion.id) : null,
  );
  const [quantity, setQuantity] = useState<number>(initialQuantity > 0 ? initialQuantity : 1);

  const selectedPortion = ingredient.portions.find(
    (p) => String(p.id) === selectedPortionId,
  ) ?? null;

  const totalWeightG = selectedPortion?.weight_g
    ? quantity * selectedPortion.weight_g
    : null;

  const handleSelectStandardMeasure = (measure: PickerStandardMeasure) => {
    setSelectedPortionId(gramPortion ? String(gramPortion.id) : null);
    setQuantity(measure.grams);
  };

  const handleConfirm = () => {
    onConfirm(
      selectedPortion?.id ?? null,
      selectedPortion?.measuring_unit_id ?? null,
      quantity,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <Egg className="w-5 h-5 text-primary" />
            {ingredient.name} hinzufügen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Menge</label>
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
              className="w-full mt-1 rounded-lg border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {ingredient.portions.length > 0 && (
            <div>
              <label className="text-sm font-medium">Einheit</label>
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
                  ingredientSlug={ingredient.slug}
                  onSelectPortion={(portionId) => setSelectedPortionId(String(portionId))}
                  onSelectStandardMeasure={handleSelectStandardMeasure}
                  onSelectGrams={() => setSelectedPortionId(null)}
                />
              </div>
            </div>
          )}

          {totalWeightG && selectedPortion?.weight_g && (
            <p className="text-xs text-muted-foreground">
              {quantity} × {selectedPortion.weight_g}g = {Math.round(totalWeightG)}g
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
