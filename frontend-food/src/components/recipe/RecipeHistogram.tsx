/**
 * RecipeHistogram - Recharts histogram with marked recipe position
 * Used in price, energy, and protein tabs
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Bucket } from '@/schemas/recipe';

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

export default function RecipeHistogram({
  buckets,
  recipeValue,
  label,
  unit,
  className,
}: RecipeHistogramProps) {
  if (!buckets || buckets.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-4 text-center">
        Nicht genug Rezepte für Vergleich
      </div>
    );
  }

  // Format data for Recharts
  const data = buckets.map((b) => ({
    min: Number(b.min.toFixed(1)),
    max: Number(b.max.toFixed(1)),
    count: b.count,
    name: `${Number(b.min.toFixed(1))}-${Number(b.max.toFixed(1))} ${unit}`,
  }));

  return (
    <div className={className}>
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </h4>
        <p className="text-sm font-bold text-foreground">
          {Number(recipeValue.toFixed(1))} {unit}
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
          <ReferenceLine
            x={`${Number(recipeValue.toFixed(1))}`}
            stroke="hsl(var(--primary))"
            strokeDasharray="5 5"
            label={{ value: 'Dieses Rezept', fontSize: 10, fill: 'hsl(var(--primary))' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
