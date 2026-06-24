/**
 * ShareSlider — a labeled percentage slider with lock button.
 * Used for basis bread type distribution and topping distribution.
 */
import { Lock, LockOpen } from 'lucide-react';

interface ShareSliderProps {
  label: string;
  value: number;         // 0–100
  locked: boolean;
  onChange: (value: number) => void;
  onToggleLock: () => void;
  /** Secondary info shown below label, e.g. "50g • 130 kcal" */
  detail?: string;
  disabled?: boolean;
}

export default function ShareSlider({
  label,
  value,
  locked,
  onChange,
  onToggleLock,
  detail,
  disabled = false,
}: ShareSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          {detail && (
            <p className="text-xs text-muted-foreground">{detail}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-mono w-8 text-right">{Math.round(value)}%</span>
          <button
            type="button"
            onClick={onToggleLock}
            disabled={disabled}
            title={locked ? 'Entsperren' : 'Sperren'}
            className={`p-1 rounded transition-colors ${
              locked
                ? 'text-primary bg-primary/10 hover:bg-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            } disabled:opacity-40`}
          >
            {locked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={locked || disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary disabled:opacity-40"
      />
    </div>
  );
}
