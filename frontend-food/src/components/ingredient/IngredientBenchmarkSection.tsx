/**
 * IngredientBenchmarkSection
 *
 * Zeigt statistische Einordnung einer Zutat:
 * - Min/Max/Durchschnitt als Slider-Leiste
 * - Histogramm für die Einkaufsgruppe (retail_section) und Global
 *
 * Wird ganz unten auf der Zutat-Detailseite eingeblendet.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useIngredientDistributions } from '@/api/supplies';
import type { DistributionBucket, DistributionStats } from '@/schemas/supply';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

// ---------------------------------------------------------------------------
// Konfiguration der angezeigten Felder
// ---------------------------------------------------------------------------

interface FieldConfig {
  label: string;
  unit: string;
  field: string;
  formatValue: (v: number) => string;
}

const BENCHMARK_FIELDS: FieldConfig[] = [
  {
    label: 'Preis',
    unit: '€/kg',
    field: 'price_per_kg',
    formatValue: (v) => `${formatNumber(v, { maxDecimals: 2 })} €`,
  },
  {
    label: 'Energie',
    unit: 'kcal/100g',
    field: 'energy_kcal',
    formatValue: (v) => `${Math.round(v)} kcal`,
  },
  {
    label: 'Protein',
    unit: 'g/100g',
    field: 'protein_g',
    formatValue: (v) => `${formatNumber(v, { maxDecimals: 1 })} g`,
  },
  {
    label: 'Kohlenhydrate',
    unit: 'g/100g',
    field: 'carbohydrate_g',
    formatValue: (v) => `${formatNumber(v, { maxDecimals: 1 })} g`,
  },
  {
    label: 'Zucker',
    unit: 'g/100g',
    field: 'sugar_g',
    formatValue: (v) => `${formatNumber(v, { maxDecimals: 1 })} g`,
  },
  {
    label: 'Fett',
    unit: 'g/100g',
    field: 'fat_g',
    formatValue: (v) => `${formatNumber(v, { maxDecimals: 1 })} g`,
  },
];

// ---------------------------------------------------------------------------
// Histogramm
// ---------------------------------------------------------------------------

interface IngredientHistogramProps {
  buckets: DistributionBucket[];
  stats: DistributionStats;
  currentValue: number | null | undefined;
  unit: string;
  label: string;
}

function IngredientHistogram({
  buckets,
  stats,
  currentValue,
  unit,
  label,
}: IngredientHistogramProps) {
  const nonEmpty = buckets.filter((b) => b.count > 0);
  if (nonEmpty.length === 0 || stats.count < 3) {
    return (
      <div className="text-caption text-muted-foreground text-center py-6">
        Nicht genug Daten für Vergleich
      </div>
    );
  }

  const data = buckets.map((b) => ({
    name: b.label,
    count: b.count,
    min: b.min,
  }));

  // Referenzlinie: Bucket finden, in dem currentValue liegt
  let refLabel: string | undefined;
  if (currentValue != null) {
    const match = buckets.find(
      (b) => currentValue >= b.min && (b.max == null || currentValue < b.max),
    );
    if (match) refLabel = match.label;
  }

  return (
    <div>
      <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {label}
        <span className="font-normal ml-1 text-muted-foreground/70">
          ({stats.count} Zutaten)
        </span>
      </p>
      {stats.mean != null && (
        <p className="text-caption text-muted-foreground mb-2">
          Ø {`${formatNumber(stats.mean, { maxDecimals: 2 })} ${unit.split('/')[0]}`}
          {stats.median != null && (
            <> · Median {`${formatNumber(stats.median, { maxDecimals: 2 })} ${unit.split('/')[0]}`}</>
          )}
        </p>
      )}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9 }}
            angle={-45}
            textAnchor="end"
            height={55}
            interval={0}
          />
          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
          <Tooltip
            formatter={(value) => [`${value} Zutaten`, 'Anzahl']}
            contentStyle={{ fontSize: 11 }}
          />
          <Bar
            dataKey="count"
            fill="hsl(var(--chart-1))"
            radius={[2, 2, 0, 0]}
          />
          {refLabel && (
            <ReferenceLine
              x={refLabel}
              stroke="hsl(var(--chart-2))"
              strokeDasharray="5 3"
              strokeWidth={2.5}
              label={{
                value: 'Diese Zutat',
                fontSize: 10,
                fill: 'hsl(var(--chart-2))',
                fontWeight: 600,
                position: 'top',
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slider-Leiste (Min / Wert / Max)
// ---------------------------------------------------------------------------

interface RangeBarProps {
  min: number;
  max: number;
  value: number;
  mean: number | null;
  formatValue: (v: number) => string;
}

function RangeBar({ min, max, value, mean, formatValue }: RangeBarProps) {
  const range = max - min;
  const pct = range > 0 ? Math.min(Math.max(((value - min) / range) * 100, 0), 100) : 50;
  const meanPct =
    mean != null && range > 0
      ? Math.min(Math.max(((mean - min) / range) * 100, 0), 100)
      : null;

  return (
    <div className="space-y-1">
      <div className="relative h-2 bg-muted rounded-full">
        {/* Durchschnittsstrich */}
        {meanPct != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40"
            style={{ left: `${meanPct}%` }}
          />
        )}
        {/* Aktueller Wert */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm z-10"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-caption text-muted-foreground">
        <span>{formatValue(min)}</span>
        {mean != null && (
          <span className="hidden sm:inline text-muted-foreground/60">Ø {formatValue(mean)}</span>
        )}
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Einzelnes Benchmark-Panel für ein Feld
// ---------------------------------------------------------------------------

interface BenchmarkPanelProps {
  cfg: FieldConfig;
  currentValue: number | null | undefined;
  retailSectionId: number | null | undefined;
  retailSectionName: string | null | undefined;
}

function BenchmarkPanel({
  cfg,
  currentValue,
  retailSectionId,
  retailSectionName,
}: BenchmarkPanelProps) {
  const globalDist = useIngredientDistributions(cfg.field);
  const sectionDist = useIngredientDistributions(cfg.field, {
    retailSectionId: retailSectionId ?? undefined,
    enabled: !!retailSectionId,
  });

  const hasValue = currentValue != null && currentValue > 0;

  // Leeres Panel wenn kein Wert vorhanden
  if (!hasValue) return null;

  const globalStats = globalDist.data?.stats;
  const globalBuckets = globalDist.data?.buckets ?? [];
  const sectionStats = sectionDist.data?.stats;
  const sectionBuckets = sectionDist.data?.buckets ?? [];

  const hasGlobal = globalStats && globalStats.count >= 3 && globalStats.p5 != null;
  const hasSection = !!retailSectionId && sectionStats && sectionStats.count >= 3 && sectionStats.p5 != null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-5">
      {/* Feldname + Aktueller Wert */}
      <div>
        <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
          {cfg.label}
        </p>
        <p className="text-section font-bold font-display text-foreground">
          {cfg.formatValue(currentValue)}
        </p>
      </div>

      {/* Min/Max Leiste – Global */}
      {hasGlobal && globalStats.p5 != null && globalStats.p95 != null && (
        <div>
          <p className="text-caption text-muted-foreground mb-1">
            Einordnung global (P5–P95)
          </p>
          <RangeBar
            min={globalStats.p5}
            max={globalStats.p95}
            value={currentValue}
            mean={globalStats.mean}
            formatValue={cfg.formatValue}
          />
        </div>
      )}

      {/* Min/Max Leiste – Einkaufsgruppe */}
      {hasSection && sectionStats.p5 != null && sectionStats.p95 != null && (
        <div>
          <p className="text-caption text-muted-foreground mb-1">
            Einordnung in {retailSectionName ?? 'Kategorie'} (P5–P95)
          </p>
          <RangeBar
            min={sectionStats.p5}
            max={sectionStats.p95}
            value={currentValue}
            mean={sectionStats.mean}
            formatValue={cfg.formatValue}
          />
        </div>
      )}

      {/* Histogramme nebeneinander */}
      <div className={`grid gap-4 ${hasSection ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        {hasGlobal && (
          <IngredientHistogram
            buckets={globalBuckets}
            stats={globalStats}
            currentValue={currentValue}
            unit={cfg.unit}
            label="Global"
          />
        )}
        {hasSection && (
          <IngredientHistogram
            buckets={sectionBuckets}
            stats={sectionStats}
            currentValue={currentValue}
            unit={cfg.unit}
            label={retailSectionName ?? 'Kategorie'}
          />
        )}
      </div>

      {/* Ladezustand */}
      {(globalDist.isLoading || sectionDist.isLoading) && (
        <div className="text-caption text-muted-foreground animate-pulse">Lade Statistiken…</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export interface IngredientBenchmarkValues {
  price_per_kg: number | null;
  energy_kcal: number | null;
  protein_g: number | null;
  carbohydrate_g: number | null;
  sugar_g: number | null;
  fat_g: number | null;
  retail_section_id: number | null;
  retail_section_name: string | null;
}

interface IngredientBenchmarkSectionProps {
  values: IngredientBenchmarkValues;
}

export function IngredientBenchmarkSection({ values }: IngredientBenchmarkSectionProps) {
  const getFieldValue = (field: string): number | null => {
    const map: Record<string, number | null> = {
      price_per_kg: values.price_per_kg,
      energy_kcal: values.energy_kcal,
      protein_g: values.protein_g,
      carbohydrate_g: values.carbohydrate_g,
      sugar_g: values.sugar_g,
      fat_g: values.fat_g,
    };
    return map[field] ?? null;
  };

  // Nur Panels rendern, für die ein Wert vorhanden ist
  const relevantFields = BENCHMARK_FIELDS.filter((cfg) => {
    const v = getFieldValue(cfg.field);
    return v != null && v > 0;
  });

  if (relevantFields.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-section font-display font-bold text-foreground flex items-center gap-2 mb-4">
        <Icon name="bar_chart" size={24} className="text-primary" />
        Einordnung im Vergleich
      </h2>
      <p className="text-body text-muted-foreground mb-4">
        Wie schneidet diese Zutat im Vergleich zu anderen ab?
        {values.retail_section_name && (
          <> Die gelbe Linie zeigt den Platz in <strong>{values.retail_section_name}</strong> und global.</>
        )}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relevantFields.map((cfg) => (
          <BenchmarkPanel
            key={cfg.field}
            cfg={cfg}
            currentValue={getFieldValue(cfg.field)}
            retailSectionId={values.retail_section_id}
            retailSectionName={values.retail_section_name}
          />
        ))}
      </div>
    </section>
  );
}
