/**
 * NutrientBalanceChart — Grouped bar chart showing actual nutrient values (Ist)
 * compared side-by-side with DGE target ranges/guidelines (Soll).
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

// Static DGE guideline values for 13-18 year olds (baseline daily values)
const BASE_TARGETS = {
  protein_g: { min: 45, max: 80 },
  fat_g: { min: 55, max: 85 },
  carbohydrate_g: { min: 250, max: 400 },
  sugar_g: { min: null, max: 50 },
  fibre_g: { min: 25, max: null },
  salt_g: { min: null, max: 5 },
};

interface NutrientBalanceChartProps {
  proteinG: number;
  fatG: number;
  carbsG: number;
  sugarG: number;
  fibreG: number;
  saltG: number;
  numDays?: number;
  showPerPortion?: boolean;
  normPortions?: number;
}

export default function NutrientBalanceChart({
  proteinG,
  fatG,
  carbsG,
  sugarG,
  fibreG,
  saltG,
  numDays = 1,
  showPerPortion = true,
  normPortions = 1,
}: NutrientBalanceChartProps) {
  const total = proteinG + fatG + carbsG;
  if (total === 0) return null;

  // Scale factor: multiplier to scale DGE baseline daily guidelines to total plan or total portions
  const scaleFactor = numDays * (showPerPortion ? 1 : normPortions);

  const getSollAndRange = (key: keyof typeof BASE_TARGETS) => {
    const target = BASE_TARGETS[key];
    const min = target.min !== null ? target.min * scaleFactor : null;
    const max = target.max !== null ? target.max * scaleFactor : null;
    let mid = 0;
    if (target.min !== null && target.max !== null) {
      mid = ((target.min + target.max) / 2) * scaleFactor;
    } else {
      mid = (target.min ?? target.max ?? 0) * scaleFactor;
    }
    return { min, max, mid };
  };

  const proteinSoll = getSollAndRange('protein_g');
  const fatSoll = getSollAndRange('fat_g');
  const carbsSoll = getSollAndRange('carbohydrate_g');
  const sugarSoll = getSollAndRange('sugar_g');
  const fibreSoll = getSollAndRange('fibre_g');
  const saltSoll = getSollAndRange('salt_g');

  const data = [
    {
      name: 'Eiweiß',
      Ist: Math.round(proteinG * 10) / 10,
      Soll: Math.round(proteinSoll.mid * 10) / 10,
      min: proteinSoll.min,
      max: proteinSoll.max,
    },
    {
      name: 'Fett',
      Ist: Math.round(fatG * 10) / 10,
      Soll: Math.round(fatSoll.mid * 10) / 10,
      min: fatSoll.min,
      max: fatSoll.max,
    },
    {
      name: 'Kohlenh.',
      Ist: Math.round(carbsG * 10) / 10,
      Soll: Math.round(carbsSoll.mid * 10) / 10,
      min: carbsSoll.min,
      max: carbsSoll.max,
    },
    {
      name: 'Zucker',
      Ist: Math.round(sugarG * 10) / 10,
      Soll: Math.round(sugarSoll.mid * 10) / 10,
      min: sugarSoll.min,
      max: sugarSoll.max,
    },
    {
      name: 'Ballasts.',
      Ist: Math.round(fibreG * 10) / 10,
      Soll: Math.round(fibreSoll.mid * 10) / 10,
      min: fibreSoll.min,
      max: fibreSoll.max,
    },
    {
      name: 'Salz',
      Ist: Math.round(saltG * 10) / 10,
      Soll: Math.round(saltSoll.mid * 10) / 10,
      min: saltSoll.min,
      max: saltSoll.max,
    },
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
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                const { name, Ist, min, max } = item;

                let rangeText = '';
                if (min !== null && max !== null) {
                  rangeText = `${Math.round(min * 10) / 10} - ${Math.round(max * 10) / 10} g`;
                } else if (min !== null) {
                  rangeText = `>= ${Math.round(min * 10) / 10} g`;
                } else if (max !== null) {
                  rangeText = `<= ${Math.round(max * 10) / 10} g`;
                }

                return (
                  <div className="bg-background border border-border p-3 rounded-lg shadow-md text-xs space-y-1.5 font-sans">
                    <p className="font-semibold text-foreground text-sm">{name}</p>
                    <div className="flex justify-between gap-6">
                      <span className="text-muted-foreground">Ist (geplant):</span>
                      <span className="font-medium text-foreground">{Ist} g</span>
                    </div>
                    {rangeText && (
                      <div className="flex justify-between gap-6 border-t pt-1 border-border/50">
                        <span className="text-muted-foreground">Soll (Richtwert):</span>
                        <span className="font-medium text-foreground">{rangeText}</span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            content={() => (
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-muted-foreground/60" />
                  <span>Ist (geplant)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border border-dashed border-muted-foreground/60 bg-muted-foreground/10" />
                  <span>Soll (DGE-Richtwert)</span>
                </div>
              </div>
            )}
          />
          <Bar dataKey="Ist" name="Ist" radius={[3, 3, 0, 0]} maxBarSize={16}>
            {data.map((_, index) => (
              <Cell key={`cell-ist-${index}`} fill={barColors[index]} />
            ))}
          </Bar>
          <Bar dataKey="Soll" name="Soll" radius={[3, 3, 0, 0]} maxBarSize={16}>
            {data.map((_, index) => (
              <Cell
                key={`cell-soll-${index}`}
                fill={barColors[index]}
                fillOpacity={0.2}
                stroke={barColors[index]}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
