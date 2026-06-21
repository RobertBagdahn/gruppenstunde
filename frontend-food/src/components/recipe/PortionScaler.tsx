import { useCallback } from 'react';
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
  /** Compact mode for sidebar use */
  compact?: boolean;
  /** Show factor quick-select buttons (0.5×, 1.5×, 2×) */
  showFactors?: boolean;
  /** Default value for factor buttons (used for scaling) */
  defaultValue?: number;
  /** Additional CSS classes */
  className?: string;
}

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

  const decrement = () => updatePortions(value - 1);
  const increment = () => updatePortions(value + 1);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200',
        compact ? 'px-3 py-2' : 'px-4 py-3',
        className,
      )}
    >
      <span className={cn('material-symbols-outlined text-amber-600', compact ? 'text-lg' : 'text-xl')}>
        restaurant
      </span>
      <span className={cn('font-medium text-amber-800 whitespace-nowrap', compact ? 'text-xs' : 'text-sm')}>
        Portionen
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className={cn(
            'flex items-center justify-center rounded-full',
            'border border-amber-300 bg-white text-amber-700',
            'hover:bg-amber-100 active:bg-amber-200 transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            compact ? 'w-7 h-7' : 'w-9 h-9',
          )}
          aria-label="Portion verringern"
        >
          <span className={cn('material-symbols-outlined', compact ? 'text-base' : 'text-lg')}>remove</span>
        </button>

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
            'text-center font-semibold text-amber-900',
            'border border-amber-300 rounded-lg bg-white',
            'focus:outline-none focus:ring-2 focus:ring-amber-400',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            compact ? 'w-12 h-7 text-sm' : 'w-14 h-9 text-lg',
          )}
          aria-label="Portionszahl"
        />

        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className={cn(
            'flex items-center justify-center rounded-full',
            'border border-amber-300 bg-white text-amber-700',
            'hover:bg-amber-100 active:bg-amber-200 transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            compact ? 'w-7 h-7' : 'w-9 h-9',
          )}
           aria-label="Portion erhöhen"
        >
          <span className={cn('material-symbols-outlined', compact ? 'text-base' : 'text-lg')}>add</span>
        </button>
      </div>

      {showFactors && (
        <div className="flex items-center gap-1.5 border-t border-amber-200 pt-2 mt-2 w-full">
          {[0.5, 1.5, 2].map((factor) => (
            <button
              key={factor}
              type="button"
              onClick={() => updatePortions(Math.round(defaultValue * factor))}
              className="flex-1 text-xs font-medium py-1 rounded-lg border border-amber-200 bg-white text-amber-700 hover:bg-amber-100 transition-colors"
            >
              {factor.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
