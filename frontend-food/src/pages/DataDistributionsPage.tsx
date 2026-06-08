import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

const TYPE_TABS = [
  { key: 'ingredients', label: 'Zutaten' },
  { key: 'recipes', label: 'Rezepte' },
] as const;

const NUTRI_SCORE_COLORS: Record<string, string> = {
  A: '#038141', B: '#85BB2F', C: '#FECB02', D: '#F0861E', E: '#E63E11',
};

export default function DataDistributionsPage() {
  const [type, setType] = useState<string>('ingredients');

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold font-display">Datenverteilungen</h1>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setType(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              type === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {type === 'ingredients' ? <IngredientCharts /> : <RecipeCharts />}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold font-display">{title}</h3>
      {children}
    </div>
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
  const { data, isLoading, error } = type === 'ingredients'
    ? useIngredientCostDistribution()
    : useRecipeCostDistribution();

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;
  if (error || !data?.buckets.length) return <div className="text-muted-foreground text-sm py-8 text-center">Keine Daten</div>;

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
  const { data, isLoading, error } = type === 'ingredients'
    ? useIngredientEnergyDistribution()
    : useRecipeCalorieDistribution();

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;
  if (error || !data?.buckets.length) return <div className="text-muted-foreground text-sm py-8 text-center">Keine Daten</div>;

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
  const { data, isLoading, error } = useIngredientEnergyDistribution();

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;
  if (error || !data?.top_dense?.length) return <div className="text-muted-foreground text-sm py-8 text-center">Keine Daten</div>;

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
  const { data, isLoading, error } = useIngredientNutrientDistribution();

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;
  if (error || !data?.scatter_data?.length) return <div className="text-muted-foreground text-sm py-8 text-center">Keine Daten</div>;

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
          <Scatter name="Vegan" data={vegan} fill="#22c55e" />
          <Scatter name="Nicht vegan" data={nonVegan} fill="#ef4444" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function NutriScoreChartView() {
  const { data, isLoading, error } = useRecipeNutriScoreDistribution();

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;
  if (error || !data?.classes?.length) return <div className="text-muted-foreground text-sm py-8 text-center">Keine Daten</div>;

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
              <Cell key={entry.name} fill={NUTRI_SCORE_COLORS[entry.name] || '#ccc'} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
