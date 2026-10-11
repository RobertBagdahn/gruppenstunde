import { useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortionScalerProps {
  /** Current portion count (controlled) */
  value: number;
  /** Min value (default: 1) */
  min?: number;
  /** Max value (default: 100) */
  max?: number;
  /** Callback when portions change */
  onChange: (portions: number) => void;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Show factor quick-select buttons (0.5×, 1.5×, 2×) */
  showFactors?: boolean;
  /** Default value for factor buttons (used for scaling) */
  defaultValue?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Portion stepper (Feldküche): two large round buttons around the number on a
 * muted track; the number can also be typed.
 */
export default function PortionScaler({
  value,
  min = 1,
  max = 100,
  onChange,
  compact = false,
  showFactors = false,
  defaultValue = 1,
  className,
}: PortionScalerProps) {
  const updatePortions = useCallback(
    (v: number) => {
      const clamped = Math.max(min, Math.min(max, v));
      onChange(clamped);
    },
    [min, max, onChange],
  );

  const stepButton = cn(
    'press flex shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-soft',
    'transition-colors hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40',
    compact ? 'h-10 w-10' : 'h-12 w-12',
  );

  return (
    <div data-testid="recipe-portion-scaler" className={cn('space-y-3', className)}>
      <div className={cn('flex items-center justify-between gap-2 rounded-full bg-muted p-1')}>
        <button
          type="button"
          onClick={() => updatePortions(value - 1)}
          disabled={value <= min}
          className={stepButton}
          aria-label="Portion verringern"
        >
          <Minus className="h-5 w-5" strokeWidth={2.4} />
        </button>

        <label className="flex min-w-0 flex-1 flex-col items-center leading-none">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) updatePortions(val);
            }}
            min={min}
            max={max}
            className={cn(
              'w-full bg-transparent text-center font-display font-extrabold text-foreground',
              'rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              compact ? 'text-section' : 'text-metric',
            )}
            aria-label="Portionszahl"
          />
          {!compact && (
            <span className="mt-1 text-caption font-semibold text-muted-foreground">
              {value === 1 ? 'Portion' : 'Portionen'}
            </span>
          )}
        </label>

        <button
          type="button"
          onClick={() => updatePortions(value + 1)}
          disabled={value >= max}
          className={stepButton}
          aria-label="Portion erhöhen"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>

      {showFactors && (
        <div className="flex items-center gap-1.5">
          {[0.5, 1.5, 2].map((factor) => (
            <button
              key={factor}
              type="button"
              onClick={() => updatePortions(Math.round(defaultValue * factor))}
              className="press h-9 flex-1 rounded-full bg-primary-soft text-caption font-bold text-primary transition-colors hover:bg-primary-soft-border/70"
            >
              {factor.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
