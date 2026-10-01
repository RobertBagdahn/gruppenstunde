import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MAX_SERVING_CONTEXT, MIN_SERVING_CONTEXT, normalizeServingContext } from '@/lib/cookingQuantityScale';

interface RecipeServingContextSelectorProps {
  /** `null` starts with an empty field that must be filled in. */
  value: number | null;
  onChange: (value: number) => void;
  /** Without a confirm handler the confirm button is hidden. */
  onConfirm?: () => void;
  description?: string;
  confirmLabel?: string;
  error?: string;
}

export default function RecipeServingContextSelector({
  value,
  onChange,
  onConfirm,
  description = 'Lege fest, für wie viele Personen du die Gesamtmengen eingeben möchtest.',
  confirmLabel = 'Zutaten bearbeiten',
  error,
}: RecipeServingContextSelectorProps) {
  const [inputValue, setInputValue] = useState(value === null ? '' : String(value));

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
    if (!inputValue.trim() && value === null) return;
    const normalized = normalizeServingContext(Number.parseInt(inputValue, 10));
    setInputValue(String(normalized));
    onChange(normalized);
  }

  return (
    <div className="rounded-xl border border-warning-border bg-warning-soft p-4 sm:p-5" data-testid="recipe-serving-context-selector">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-body font-semibold text-warning">Für wie viele Personen?</h3>
          <p className="mt-1 max-w-xl text-body text-warning">{description}</p>
        </div>
        <div className="flex items-end gap-3">
          <label className="text-body font-medium text-warning">
            Personen
            <input
              type="number"
              min={MIN_SERVING_CONTEXT}
              max={MAX_SERVING_CONTEXT}
              value={inputValue}
              onChange={(event) => handleChange(event.target.value)}
              onBlur={handleBlur}
              aria-label="Personenzahl"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'recipe-serving-context-error' : undefined}
              data-testid="recipe-serving-context-input"
              className="mt-1 block w-24 rounded-lg border border-warning-border bg-white px-3 py-2 text-center text-emphasis font-semibold text-warning focus:outline-none focus:ring-2 focus:ring-warning"
            />
            {error && <span id="recipe-serving-context-error" role="alert" className="mt-1 block max-w-48 text-caption text-danger-foreground">{error}</span>}
          </label>
          {onConfirm && (
            <Button type="button" onClick={onConfirm} data-testid="recipe-serving-context-confirm">
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
