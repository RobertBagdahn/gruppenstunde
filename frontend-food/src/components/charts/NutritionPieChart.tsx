/**
 * NutritionPieChart — Macro-nutrient distribution as a pie chart.
 * Lazy-loaded via React.lazy() at the call site.
 */
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = {
  protein: 'hsl(var(--chart-5))', // red/rose — matches NutrientCard "Protein" color
  fat: 'hsl(var(--chart-2))',     // amber — matches NutrientCard "Fett" color
  carbs: 'hsl(var(--chart-3))',   // teal/blue — matches NutrientCard "Kohlenhydrate" color
};

interface NutritionPieChartProps {
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export default function NutritionPieChart({ proteinG, fatG, carbsG }: NutritionPieChartProps) {
  const total = proteinG + fatG + carbsG;
  if (total === 0) return null;

  const data = [
    { name: 'Eiweiß', value: Math.round(proteinG * 10) / 10, color: COLORS.protein },
    { name: 'Fett', value: Math.round(fatG * 10) / 10, color: COLORS.fat },
    { name: 'Kohlenhydrate', value: Math.round(carbsG * 10) / 10, color: COLORS.carbs },
  ];

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}g`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown, name: unknown) => [`${value} g`, String(name)]}
            contentStyle={{
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value: string) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
