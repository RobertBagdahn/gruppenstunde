import { cn } from '@/lib/utils';

interface SollIstBarProps {
  current: number;
  min_green: number | null;
  max_green: number | null;
  target_mid: number | null;
  status: 'green' | 'yellow' | 'red';
  unit?: string;
  className?: string;
  scopeLabel?: string;
}

export default function SollIstBar({
  current,
  min_green,
  max_green,
  target_mid,
  status,
  unit = '',
  className,
  scopeLabel,
}: SollIstBarProps) {
  // If there are no target bounds or thresholds, we cannot display a Soll-Ist comparison
  if (min_green === null && max_green === null && target_mid === null) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        <span>Ist: <strong>{current.toFixed(1)} {unit}</strong></span>
      </div>
    );
  }

  // Determine the scale max value
  const maxScale = Math.max(
    current,
    max_green ?? 0,
    min_green ?? 0,
    target_mid ?? 0
  ) * 1.15;
  const maxValue = Math.max(maxScale, 1.0);

  // Percentages for rendering
  const currentPct = Math.min((current / maxValue) * 100, 100);
  const minGreenPct = min_green !== null ? (min_green / maxValue) * 100 : null;
  const maxGreenPct = max_green !== null ? (max_green / maxValue) * 100 : null;
  const targetMidPct = target_mid !== null ? (target_mid / maxValue) * 100 : null;

  // Status colors
  const statusColors = {
    green: {
      bar: 'bg-primary',
      text: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
    },
    yellow: {
      bar: 'bg-[hsl(var(--chart-2))]',
      text: 'text-[hsl(var(--chart-2))]',
      bg: 'bg-[hsl(var(--chart-2))]/10',
      border: 'border-[hsl(var(--chart-2))]/20',
    },
    red: {
      bar: 'bg-destructive',
      text: 'text-destructive',
      bg: 'bg-destructive/10',
      border: 'border-destructive/20',
    },
  };

  const activeColor = statusColors[status];

  // Formatting helper for currency/value
  const formatVal = (val: number) => {
    if (unit === '€' || unit === 'EUR') {
      return `${val.toFixed(2)} €`;
    }
    return `${unit === 'kcal' ? Math.round(val) : parseFloat(val.toFixed(1))} ${unit}`;
  };

  return (
    <div className={cn("space-y-1.5 py-1 w-full", className)}>
      {scopeLabel && (
        <div className="text-xs text-muted-foreground font-medium mb-0.5">
          {scopeLabel}
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          Ist: <strong className={activeColor.text}>{formatVal(current)}</strong>
        </span>
        <span className="text-muted-foreground text-[11px]">
          {min_green !== null && max_green !== null ? (
            <span>Soll: {formatVal(min_green)} – {formatVal(max_green)}</span>
          ) : max_green !== null ? (
            <span>Soll: ≤ {formatVal(max_green)}</span>
          ) : min_green !== null ? (
            <span>Soll: ≥ {formatVal(min_green)}</span>
          ) : target_mid !== null ? (
            <span>Soll-Ziel: {formatVal(target_mid)}</span>
          ) : null}
        </span>
      </div>

      <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
        {/* Current status value bar fill */}
        <div
          className={cn("absolute top-0 bottom-0 rounded-full transition-all duration-300", activeColor.bar)}
          style={{ width: `${currentPct}%` }}
        />

        {/* Target green zone — rendered on top so the Soll-range stays visible even when the Ist-bar covers it */}
        {maxGreenPct !== null && (
          <div
            className="absolute top-0 bottom-0 z-10 bg-primary/40 border-x-2 border-primary/70 pointer-events-none"
            style={{
              left: `${minGreenPct ?? 0}%`,
              width: `${Math.max(maxGreenPct - (minGreenPct ?? 0), 1.5)}%`,
            }}
            title={`Zielbereich: ${formatVal(min_green ?? 0)} – ${formatVal(max_green ?? 0)}`}
          />
        )}

        {/* Ideal center/midpoint indicator */}
        {targetMidPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-20 opacity-90"
            style={{ left: `${targetMidPct}%` }}
            title="Zielwert"
          />
        )}
      </div>
    </div>
  );
}
