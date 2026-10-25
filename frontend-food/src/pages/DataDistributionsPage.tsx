import { useState } from 'react';
import { nutriScoreFill } from '@/components/shared/NutriScoreBadge';
import { cn } from '@/lib/utils';
import {
  useIngredientCostDistribution,
  useIngredientEnergyDistribution,
  useIngredientNutrientDistribution,
  useRecipeCostDistribution,
  useRecipeCalorieDistribution,
  useRecipeNutriScoreDistribution,
} from '@/api/dataQuality';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter,
  PieChart, Pie, Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorDisplay from '@/components/ErrorDisplay';
import PageHeader from '@/components/shared/PageHeader';

const TYPE_TABS = [
  { key: 'ingredients', label: 'Zutaten' },
  { key: 'recipes', label: 'Rezepte' },
] as const;


export default function DataDistributionsPage() {
  const [type, setType] = useState<string>('ingredients');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <PageHeader
        title="Datenverteilungen"
        description="Verteilungen von Kosten, Energie und Nährwerten in Zutaten und Rezepten"
      />

      {/* Type chips: white with a thin border, the active chip in petrol (as in the statistics page) */}
      <div className="mb-6 overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-2">
          {TYPE_TABS.map((tab) => {
            const active = type === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                onClick={() => setType(tab.key)}
                className={cn(
                  'press flex min-h-11 md:min-h-9 items-center rounded-full border bg-card px-4 text-body font-semibold whitespace-nowrap transition-colors duration-200',
                  active
                    ? 'border-primary text-primary-dark'
                    : 'border-border text-foreground hover:border-primary-soft-border'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {type === 'ingredients' ? <IngredientCharts /> : <RecipeCharts />}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-card p-4 md:p-6 space-y-3 shadow-card">
      <h2 className="text-section font-semibold font-display">{title}</h2>
      {children}
    </section>
  );
}

function IngredientCharts() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard title="Kostenverteilung (€/kg)">
        <CostChart type="ingredients" />
      </ChartCard>
      <ChartCard title="Kalorienverteilung (kcal/100g)">
        <EnergyChart type="ingredients" />
      </ChartCard>
      <ChartCard title="Energiedichte Top 10">
        <TopEnergyChart />
      </ChartCard>
      <ChartCard title="Makronährstoffe (Fett vs. Kohlenhydrate)">
        <NutrientScatterChartView />
      </ChartCard>
    </div>
  );
}

function RecipeCharts() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard title="Kosten pro Portion">
        <CostChart type="recipes" />
      </ChartCard>
      <ChartCard title="Kalorien pro Portion">
        <EnergyChart type="recipes" />
      </ChartCard>
      <ChartCard title="Nutri-Score Verteilung">
        <NutriScoreChartView />
      </ChartCard>
    </div>
  );
}


function CostChart({ type }: { type: 'ingredients' | 'recipes' }) {
  // Hooks must run unconditionally; select the relevant result by type.
  const ingredientQuery = useIngredientCostDistribution();
  const recipeQuery = useRecipeCostDistribution();
  const { data, isLoading, error, refetch } = type === 'ingredients' ? ingredientQuery : recipeQuery;

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error) return <ErrorDisplay variant="inline" error={error} title="Daten konnten nicht geladen werden" onRetry={() => void refetch()} />;
  if (!data?.buckets.length) return <div className="text-muted-foreground text-body py-8 text-center">Für diese Auswahl gibt es noch keine Daten.</div>;

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.buckets}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EnergyChart({ type }: { type: 'ingredients' | 'recipes' }) {
  // Hooks must run unconditionally; select the relevant result by type.
  const ingredientQuery = useIngredientEnergyDistribution();
  const recipeQuery = useRecipeCalorieDistribution();
  const { data, isLoading, error, refetch } = type === 'ingredients' ? ingredientQuery : recipeQuery;

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error) return <ErrorDisplay variant="inline" error={error} title="Daten konnten nicht geladen werden" onRetry={() => void refetch()} />;
  if (!data?.buckets.length) return <div className="text-muted-foreground text-body py-8 text-center">Für diese Auswahl gibt es noch keine Daten.</div>;

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.buckets}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--chart-5))" radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopEnergyChart() {
  const { data, isLoading, error, refetch } = useIngredientEnergyDistribution();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error) return <ErrorDisplay variant="inline" error={error} title="Daten konnten nicht geladen werden" onRetry={() => void refetch()} />;
  if (!data?.top_dense?.length) return <div className="text-muted-foreground text-body py-8 text-center">Für diese Auswahl gibt es noch keine Daten.</div>;

  const chartData = data.top_dense.slice(0, 10);

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
          <Tooltip />
          <Bar dataKey="energy_kcal" fill="hsl(var(--chart-2))" radius={[0, 3, 3, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function NutrientScatterChartView() {
  const { data, isLoading, error, refetch } = useIngredientNutrientDistribution();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error) return <ErrorDisplay variant="inline" error={error} title="Daten konnten nicht geladen werden" onRetry={() => void refetch()} />;
  if (!data?.scatter_data?.length) return <div className="text-muted-foreground text-body py-8 text-center">Für diese Auswahl gibt es noch keine Daten.</div>;

  const vegan = data.scatter_data.filter((d) => d.is_vegan).map((d) => ({ x: d.fat_g, y: d.carbohydrate_g, name: d.name }));
  const nonVegan = data.scatter_data.filter((d) => !d.is_vegan).map((d) => ({ x: d.fat_g, y: d.carbohydrate_g, name: d.name }));

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis type="number" dataKey="x" name="Fett (g)" unit="g" tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="y" name="Kohlenhydrate (g)" unit="g" tick={{ fontSize: 10 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter name="Vegan" data={vegan} fill="hsl(var(--chart-1))" />
          <Scatter name="Nicht vegan" data={nonVegan} fill="hsl(var(--chart-2))" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function NutriScoreChartView() {
  const { data, isLoading, error, refetch } = useRecipeNutriScoreDistribution();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error) return <ErrorDisplay variant="inline" error={error} title="Daten konnten nicht geladen werden" onRetry={() => void refetch()} />;
  if (!data?.classes?.length) return <div className="text-muted-foreground text-body py-8 text-center">Für diese Auswahl gibt es noch keine Daten.</div>;

  const pieData = data.classes.map((c) => ({ name: c.class_label, value: c.count }));

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={70}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={false}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={nutriScoreFill(entry.name)} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
