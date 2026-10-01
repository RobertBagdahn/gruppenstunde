/**
 * RecipeHistogram - Recharts histogram with marked recipe position
 * Used in price, energy, and protein tabs
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Bucket } from '@/schemas/recipe';
import { formatNumber } from '@/lib/format';

interface RecipeHistogramProps {
  /** Histogram buckets from API */
  buckets: Bucket[];
  /** Current recipe value (to mark position) */
  recipeValue: number;
  /** Chart label */
  label: string;
  /** Unit for display */
  unit: string;
  /** Optional className */
  className?: string;
}

/** "0,5–1 €" in German number format. */
export function bucketLabel(bucket: Pick<Bucket, 'min' | 'max'>, unit: string): string {
  return `${formatNumber(bucket.min, { maxDecimals: 1 })}–${formatNumber(bucket.max, { maxDecimals: 1 })} ${unit}`;
}

export default function RecipeHistogram({
  buckets,
  recipeValue,
  label,
  unit,
  className,
}: RecipeHistogramProps) {
  if (!buckets || buckets.length === 0) {
    return (
      <div className="text-caption text-muted-foreground p-4 text-center">
        Nicht genug Rezepte für Vergleich
      </div>
    );
  }

  // Format data for Recharts
  // formatNumber returns German text ("0,5"); never parse it back into a number.
  const data = buckets.map((b) => ({
    min: b.min,
    max: b.max,
    count: b.count,
    name: bucketLabel(b, unit),
  }));

  // Find the bucket label that contains the current recipe value
  let refLabel: string | undefined;
  if (recipeValue != null) {
    const match = buckets.find(
      (b) => recipeValue >= b.min && (b.max == null || recipeValue < b.max),
    );
    if (match) {
      refLabel = bucketLabel(match, unit);
    }
  }

  return (
    <div className={className}>
      <div className="mb-3">
        <h4 className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </h4>
        <p className="text-body font-bold text-foreground">
          {formatNumber(recipeValue, { maxDecimals: 1 })} {unit}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value) => `${value} Rezepte`}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="count" fill="hsl(var(--chart-1))" />
          {refLabel && (
            <ReferenceLine
              x={refLabel}
              stroke="hsl(var(--chart-2))"
              strokeDasharray="5 3"
              strokeWidth={2.5}
              label={{
                value: 'Dieses Rezept',
                fontSize: 10,
                fill: 'hsl(var(--chart-2))',
                fontWeight: 600,
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
