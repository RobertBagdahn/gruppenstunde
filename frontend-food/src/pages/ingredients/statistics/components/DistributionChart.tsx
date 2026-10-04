import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DistributionOut } from '@/schemas/supply';
import { formatNumber } from '@/lib/format';

interface DistributionChartProps {
  data: DistributionOut;
  unit: string;
  label: string;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function DistributionChart({ data, unit, label }: DistributionChartProps) {
  const { buckets, stats } = data;

  const chartData = buckets.map((b) => ({
    label: b.label,
    count: b.count,
    percentage: b.percentage,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <StatBox label="Anzahl" value={stats.count} />
        <StatBox label="Mittelwert" value={stats.mean !== null ? `${formatNumber(stats.mean, { maxDecimals: 1 })} ${unit}` : '–'} />
        <StatBox label="Median" value={stats.median !== null ? `${formatNumber(stats.median, { maxDecimals: 1 })} ${unit}` : '–'} />
        <StatBox label="5. Perzentil" value={stats.p5 !== null ? `${formatNumber(stats.p5, { maxDecimals: 1 })} ${unit}` : '–'} />
        <StatBox label="95. Perzentil" value={stats.p95 !== null ? `${formatNumber(stats.p95, { maxDecimals: 1 })} ${unit}` : '–'} />
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 0, top: 5, bottom: 20 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={Math.max(0, Math.floor(chartData.length / 15))}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={((value: unknown, name: string) => [
                name === 'percentage' ? `${formatNumber(Number(value), { maxDecimals: 1 })}%` : value,
                name === 'count' ? 'Anzahl' : 'Anteil',
              ]) as never}
              labelFormatter={(l: unknown) => `${label}: ${l}`}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-card p-3 text-center shadow-card">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="text-section font-bold font-display text-foreground mt-0.5">{value}</p>
    </div>
  );
}
