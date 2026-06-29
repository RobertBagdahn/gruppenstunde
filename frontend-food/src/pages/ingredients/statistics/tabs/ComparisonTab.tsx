import { useSearchParams } from 'react-router-dom';
import { useNutritionalTags } from '@/api/supplies';
import { useIngredientComparison } from '@/api/supplies';
import TabFilters from '../components/TabFilters';
import DistributionChart from '../components/DistributionChart';

const METRICS = [
  { value: 'energy_kcal', label: 'Energie', unit: 'kcal' },
  { value: 'protein_g', label: 'Protein', unit: 'g' },
  { value: 'fat_g', label: 'Fett', unit: 'g' },
  { value: 'sugar_g', label: 'Zucker', unit: 'g' },
  { value: 'fibre_g', label: 'Ballaststoffe', unit: 'g' },
  { value: 'carbohydrate_g', label: 'Kohlenhydrate', unit: 'g' },
  { value: 'salt_g', label: 'Salz', unit: 'g' },
  { value: 'price_per_kg', label: 'Preis pro kg', unit: '€' },
  { value: 'environmental_score', label: 'Umwelt-Score', unit: 'pts' },
  { value: 'child_score', label: 'Child-Score', unit: 'pts' },
];

export default function ComparisonTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const groupBy = searchParams.get('group_by') || 'vegan';
  const metric = searchParams.get('metric') || 'protein_g';

  const { data: tags } = useNutritionalTags();
  const { data, isLoading } = useIngredientComparison(groupBy, metric, { retailSectionId });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const currentMetric = METRICS.find((m) => m.value === metric);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vergleiche die Nährwerte von Zutaten mit einem bestimmten Tag ({groupBy}) gegen den Rest der Datenbank.
      </p>
      <TabFilters
        showRetailSection
        extraContent={
          <>
            <select
              value={groupBy}
              onChange={(e) => updateParam('group_by', e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            >
              {tags?.map((tag) => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
            <select
              value={metric}
              onChange={(e) => updateParam('metric', e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </>
        }
      />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <div className="space-y-6">
          {data.mean_difference_pct !== null && (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Mittlere Abweichung ({data.group_label} vs. Rest)
              </p>
              <p className={`text-2xl font-bold font-display ${data.mean_difference_pct > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.mean_difference_pct > 0 ? '+' : ''}{data.mean_difference_pct}%
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {data.group.label} ({data.group.count} Zutaten)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Mittelwert</p>
                  <p className="text-lg font-bold font-display">
                    {data.group.mean !== null ? `${data.group.mean.toFixed(1)} ${data.metric_unit}` : '–'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Median</p>
                  <p className="text-lg font-bold font-display">
                    {data.group.median !== null ? `${data.group.median.toFixed(1)} ${data.metric_unit}` : '–'}
                  </p>
                </div>
              </div>
              {data.group.buckets.length > 0 && (
                <DistributionChart
                  data={{ buckets: data.group.buckets, stats: { mean: data.group.mean, median: data.group.median, p5: data.group.p5, p95: data.group.p95, count: data.group.count } }}
                  unit={data.metric_unit}
                  label={currentMetric?.label ?? metric}
                />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Rest ({data.rest.count} Zutaten)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Mittelwert</p>
                  <p className="text-lg font-bold font-display">
                    {data.rest.mean !== null ? `${data.rest.mean.toFixed(1)} ${data.metric_unit}` : '–'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Median</p>
                  <p className="text-lg font-bold font-display">
                    {data.rest.median !== null ? `${data.rest.median.toFixed(1)} ${data.metric_unit}` : '–'}
                  </p>
                </div>
              </div>
              {data.rest.buckets.length > 0 && (
                <DistributionChart
                  data={{ buckets: data.rest.buckets, stats: { mean: data.rest.mean, median: data.rest.median, p5: data.rest.p5, p95: data.rest.p95, count: data.rest.count } }}
                  unit={data.metric_unit}
                  label={currentMetric?.label ?? metric}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
