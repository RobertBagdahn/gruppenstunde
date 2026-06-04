/**
 * NutrientBalanceChart — Stacked bar chart showing macro-nutrient totals.
 * Used in MealPlanDetailPage NutritionView.
 * Lazy-loaded via React.lazy() at the call site.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

const COLORS = {
  protein: 'hsl(var(--chart-5))',   // red/rose
  fat: 'hsl(var(--chart-2))',       // amber
  carbs: 'hsl(var(--chart-3))',     // teal/blue
};

interface NutrientBalanceChartProps {
  proteinG: number;
  fatG: number;
  carbsG: number;
  sugarG: number;
  fibreG: number;
  saltG: number;
  /** Label for the data set (e.g. "Gesamt" or "Pro Portion") */
  label?: string;
}

export default function NutrientBalanceChart({
  proteinG,
  fatG,
  carbsG,
  sugarG,
  fibreG,
  saltG,
  label = 'Nährstoffe',
}: NutrientBalanceChartProps) {
  const total = proteinG + fatG + carbsG;
  if (total === 0) return null;

  const data = [
    { name: 'Eiweiß', value: Math.round(proteinG * 10) / 10 },
    { name: 'Fett', value: Math.round(fatG * 10) / 10 },
    { name: 'Kohlenh.', value: Math.round(carbsG * 10) / 10 },
    { name: 'Zucker', value: Math.round(sugarG * 10) / 10 },
    { name: 'Ballasts.', value: Math.round(fibreG * 10) / 10 },
    { name: 'Salz', value: Math.round(saltG * 10) / 10 },
  ];

  const barColors = [
    COLORS.protein,
    COLORS.fat,
    COLORS.carbs,
    'hsl(var(--chart-4))', // purple (sugar)
    'hsl(var(--chart-1))', // green (fibre)
    'hsl(var(--chart-3) / 0.5)', // half-opacity teal/blue (salt)
  ];

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={50}
            unit=" g"
          />
          <Tooltip
            formatter={(value: unknown) => [`${value} g`, label]}
            contentStyle={{
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
            }}
          />
          <Legend
            verticalAlign="bottom"
            content={() => (
              <p className="text-center text-xs text-muted-foreground mt-2">{label}</p>
            )}
          />
          <Bar dataKey="value" name={label} radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={barColors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
