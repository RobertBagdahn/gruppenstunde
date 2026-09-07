import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MAX_SERVING_CONTEXT, MIN_SERVING_CONTEXT, normalizeServingContext } from '@/lib/cookingQuantityScale';

interface RecipeServingContextSelectorProps {
  value: number;
  onChange: (value: number) => void;
  onConfirm: () => void;
  description?: string;
  confirmLabel?: string;
}

export default function RecipeServingContextSelector({
  value,
  onChange,
  onConfirm,
  description = 'Lege fest, für wie viele Personen du die Gesamtmengen eingeben möchtest.',
  confirmLabel = 'Zutaten bearbeiten',
}: RecipeServingContextSelectorProps) {
  const [inputValue, setInputValue] = useState(String(value));

  function handleChange(rawValue: string) {
    setInputValue(rawValue);
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isInteger(parsed)) {
      const normalized = normalizeServingContext(parsed);
      setInputValue(String(normalized));
      onChange(normalized);
    }
  }

  function handleBlur() {
    const normalized = normalizeServingContext(Number.parseInt(inputValue, 10));
    setInputValue(String(normalized));
    onChange(normalized);
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5" data-testid="recipe-serving-context-selector">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-amber-900">Für wie viele Personen?</h3>
          <p className="mt-1 max-w-xl text-sm text-amber-800">{description}</p>
        </div>
        <div className="flex items-end gap-3">
          <label className="text-sm font-medium text-amber-900">
            Personen
            <input
              type="number"
              min={MIN_SERVING_CONTEXT}
              max={MAX_SERVING_CONTEXT}
              value={inputValue}
              onChange={(event) => handleChange(event.target.value)}
              onBlur={handleBlur}
              aria-label="Personenzahl"
              data-testid="recipe-serving-context-input"
              className="mt-1 block w-24 rounded-lg border border-amber-300 bg-white px-3 py-2 text-center text-base font-semibold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <Button type="button" onClick={onConfirm} data-testid="recipe-serving-context-confirm">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
