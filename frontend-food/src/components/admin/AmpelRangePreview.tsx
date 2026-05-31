/**
 * AmpelRangePreview — Visual traffic-light range bar.
 * Shows red/yellow/green/yellow/red zones based on Rule thresholds.
 */

interface AmpelRangePreviewProps {
  minYellow: number | null;
  minGreen: number | null;
  maxGreen: number | null;
  maxYellow: number | null;
  unit?: string;
}

export default function AmpelRangePreview({
  minYellow,
  minGreen,
  maxGreen,
  maxYellow,
  unit = '',
}: AmpelRangePreviewProps) {
  // Determine the display range
  const values = [minYellow, minGreen, maxGreen, maxYellow].filter(
    (v): v is number => v != null,
  );

  if (values.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">Keine Schwellwerte</div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.2 || 10;
  const rangeMin = min - padding;
  const rangeMax = max + padding;
  const totalRange = rangeMax - rangeMin;

  const pct = (v: number) => ((v - rangeMin) / totalRange) * 100;

  // Build zones
  const zones: { left: number; width: number; color: string }[] = [];

  if (minYellow != null && minGreen != null) {
    // Red zone: left edge to minYellow
    zones.push({ left: 0, width: pct(minYellow), color: 'bg-red-200' });
    // Yellow zone: minYellow to minGreen
    zones.push({ left: pct(minYellow), width: pct(minGreen) - pct(minYellow), color: 'bg-yellow-200' });
  } else if (minGreen != null) {
    // Yellow zone from edge to minGreen
    zones.push({ left: 0, width: pct(minGreen), color: 'bg-yellow-200' });
  } else if (minYellow != null) {
    zones.push({ left: 0, width: pct(minYellow), color: 'bg-red-200' });
  }

  // Green zone
  const greenStart = minGreen != null ? pct(minGreen) : minYellow != null ? pct(minYellow) : 0;
  const greenEnd = maxGreen != null ? pct(maxGreen) : maxYellow != null ? pct(maxYellow) : 100;
  zones.push({ left: greenStart, width: greenEnd - greenStart, color: 'bg-green-200' });

  if (maxGreen != null && maxYellow != null) {
    // Yellow zone: maxGreen to maxYellow
    zones.push({ left: pct(maxGreen), width: pct(maxYellow) - pct(maxGreen), color: 'bg-yellow-200' });
    // Red zone: maxYellow to right edge
    zones.push({ left: pct(maxYellow), width: 100 - pct(maxYellow), color: 'bg-red-200' });
  } else if (maxGreen != null) {
    zones.push({ left: pct(maxGreen), width: 100 - pct(maxGreen), color: 'bg-yellow-200' });
  } else if (maxYellow != null) {
    zones.push({ left: pct(maxYellow), width: 100 - pct(maxYellow), color: 'bg-red-200' });
  }

  return (
    <div className="space-y-1">
      <div className="relative h-4 rounded-full overflow-hidden bg-muted">
        {zones.map((zone, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 ${zone.color}`}
            style={{ left: `${zone.left}%`, width: `${zone.width}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {minYellow != null && <span>{minYellow}{unit}</span>}
        {minGreen != null && <span>{minGreen}{unit}</span>}
        {maxGreen != null && <span className="ml-auto">{maxGreen}{unit}</span>}
        {maxYellow != null && <span>{maxYellow}{unit}</span>}
      </div>
    </div>
  );
}
