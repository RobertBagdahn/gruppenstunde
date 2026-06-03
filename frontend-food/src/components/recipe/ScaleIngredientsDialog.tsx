/**
 * ScaleIngredientsDialog — Lets the user scale all recipe ingredients up or
 * down by an arbitrary factor. Modifications are applied to the frontend-only
 * recipe modification store (no immediate persistence).
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ScaleIngredientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen factor when the user confirms */
  onScale: (factor: number) => void;
}

const PRESETS = [
  { label: '×0,8', value: 0.8 },
  { label: '×0,9', value: 0.9 },
  { label: '×1,0', value: 1.0 },
  { label: '×1,1', value: 1.1 },
  { label: '×1,2', value: 1.2 },
];

export default function ScaleIngredientsDialog({
  open,
  onOpenChange,
  onScale,
}: ScaleIngredientsDialogProps) {
  const [factorInput, setFactorInput] = useState('1,0');

  // Parse German-style ("1,5") or English-style ("1.5") decimal input
  const parsedFactor = (() => {
    const normalized = factorInput.trim().replace(',', '.');
    const num = Number.parseFloat(normalized);
    return Number.isFinite(num) ? num : NaN;
  })();

  const isValid = Number.isFinite(parsedFactor) && parsedFactor > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onScale(parsedFactor);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setFactorInput('1,0');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="material-symbols-outlined text-rose-500">scale</span>
            Zutaten skalieren
          </DialogTitle>
          <DialogDescription>
            Alle Zutatenmengen werden mit dem gewählten Faktor multipliziert.
            Werte unter 1 verkleinern, Werte über 1 vergrößern die Mengen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setFactorInput(String(preset.value).replace('.', ','))}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors',
                  parsedFactor === preset.value
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'hover:bg-muted',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom factor */}
          <div className="space-y-1.5">
            <Label htmlFor="scale-factor">Faktor</Label>
            <Input
              id="scale-factor"
              type="text"
              inputMode="decimal"
              value={factorInput}
              onChange={(e) => setFactorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              placeholder="z.B. 2 oder 1,5"
              autoFocus
            />
            {!isValid && factorInput.trim() !== '' && (
              <p className="text-xs text-destructive">
                Bitte einen positiven Faktor eingeben.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Skalieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
