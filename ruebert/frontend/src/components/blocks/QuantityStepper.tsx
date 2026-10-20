import { formatInt } from '@/lib/format';
import { nextQuantity } from '@/lib/quantity';

export type QuantityStepperProps = {
  label: string;
  value: number;
  /** Grid step, e.g. 5,000 for the own brand or a packaging unit for the third-party brand. */
  step: number;
  minimum?: number;
  unit?: string;
  onChange: (value: number) => void;
};

/** Changes a quantity only in allowed steps. There is no free text field, so no value is changed without notice. */
export function QuantityStepper({ label, value, step, minimum = step, unit = 'Tüten', onChange }: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`${label} verringern`}
        onClick={() => onChange(nextQuantity(value, 'down', step, minimum))}
        disabled={value === 0}
        className="size-8 rounded-md border border-border-strong bg-panel text-emphasis text-foreground-2 hover:text-foreground-strong disabled:opacity-40"
      >
        −
      </button>
      <output aria-live="polite" className="min-w-[7.5rem] text-center font-mono text-emphasis text-foreground-strong">
        {formatInt(value)} {unit}
      </output>
      <button
        type="button"
        aria-label={`${label} erhöhen`}
        onClick={() => onChange(nextQuantity(value, 'up', step, minimum))}
        className="size-8 rounded-md border border-border-strong bg-panel text-emphasis text-foreground-2 hover:text-foreground-strong"
      >
        +
      </button>
    </div>
  );
}
