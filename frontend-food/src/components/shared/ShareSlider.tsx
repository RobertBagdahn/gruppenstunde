/**
 * Share slider shared by the breakfast and buffet assistants.
 */
import { Lock, LockOpen } from 'lucide-react';

interface ShareSliderProps {
  label: string;
  value: number;
  locked: boolean;
  onChange: (value: number) => void;
  onToggleLock: () => void;
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{label}</p>
          {detail && <p className="text-caption text-muted-foreground">{detail}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="w-8 text-right font-mono text-body">{Math.round(value)}%</span>
          <button
            type="button"
            onClick={onToggleLock}
            disabled={disabled}
            title={locked ? 'Entsperren' : 'Sperren'}
            className={`rounded-lg p-1 transition-colors ${
              locked
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            } disabled:opacity-40`}
          >
            {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <input
        type="range"
        aria-label={`Anteil für ${label}`}
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={locked || disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary disabled:opacity-40"
      />
    </div>
  );
}
