import { RECIPE_TYPE_OPTIONS, type RecipeTypeStats } from '@/schemas/recipe';

interface MetricConfig {
  label: string;
  unit: string;
  getValue: (stats: RecipeTypeStats) => number | null | undefined;
  getMin: (stats: RecipeTypeStats) => number | null | undefined;
  getMax: (stats: RecipeTypeStats) => number | null | undefined;
  getAvg: (stats: RecipeTypeStats) => number | null | undefined;
  getMedian: (stats: RecipeTypeStats) => number | null | undefined;
}

const METRICS: Record<string, MetricConfig> = {
  price: {
    label: 'Preis',
    unit: '€',
    getValue: (s) => s.price_avg,
    getMin: (s) => s.price_min,
    getMax: (s) => s.price_max,
    getAvg: (s) => s.price_avg,
    getMedian: (s) => s.price_median,
  },
  energy: {
    label: 'Kalorien',
    unit: 'kcal',
    getValue: (s) => s.energy_avg,
    getMin: (s) => s.energy_min,
    getMax: (s) => s.energy_max,
    getAvg: (s) => s.energy_avg,
    getMedian: (s) => s.energy_median,
  },
  weight: {
    label: 'Gewicht',
    unit: 'g',
    getValue: (s) => s.weight_avg,
    getMin: (s) => s.weight_min,
    getMax: (s) => s.weight_max,
    getAvg: (s) => s.weight_avg,
    getMedian: (s) => s.weight_median,
  },
};

function getTypeLabel(recipeType: string): string {
  const option = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipeType);
  return option?.label ?? recipeType;
}

interface Props {
  stats: RecipeTypeStats;
  currentValue: number;
  metric: 'price' | 'energy' | 'weight';
}

export function RecipeCategoryBenchmark({ stats, currentValue, metric }: Props) {
  const cfg = METRICS[metric];
  const min = cfg.getMin(stats);
  const max = cfg.getMax(stats);
  const avg = cfg.getAvg(stats);
  const median = cfg.getMedian(stats);

  if (min == null || max == null || avg == null) return null;

  const range = max - min;
  const positionPercent = range > 0 ? ((currentValue - min) / range) * 100 : 50;
  const percentile = range > 0
    ? Math.round(((currentValue - min) / range) * 100)
    : 50;

  const formatVal = (v: number) =>
    metric === 'price' ? `${v.toFixed(2)} ${cfg.unit}` : `${Math.round(v)} ${cfg.unit}`;

  const typeLabel = getTypeLabel(stats.recipe_type);
  const isBelowAvg = currentValue <= avg;
  const comparisonLabels = metric === 'price'
    ? { below: 'Günstiger', above: 'Teurer' }
    : { below: 'Weniger', above: 'Mehr' };
  const label = isBelowAvg ? comparisonLabels.below : comparisonLabels.above;

  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Kategorievergleich: {typeLabel}
        <span className="font-normal ml-1.5 text-xs text-muted-foreground">
          ({stats.count} Rezepte)
        </span>
      </h3>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatVal(min)}</span>
        {median != null && (
          <span className="hidden sm:inline">Median {formatVal(median)}</span>
        )}
        <span>Ø {formatVal(avg)}</span>
        <span>{formatVal(max)}</span>
      </div>

      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-muted-foreground/20 rounded-full"
          style={{
            left: `${Math.min(positionPercent, 100)}%`,
            width: `${Math.max(100 - positionPercent, 0)}%`,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow-md border-2 border-background z-10"
          style={{ left: `calc(${Math.min(Math.max(positionPercent, 0), 100)}% - 7px)` }}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        <span className="font-semibold text-foreground">{label}</span>
        {' '}als geschätzt {percentile}% der {typeLabel}-Rezepte
      </p>
    </div>
  );
}
