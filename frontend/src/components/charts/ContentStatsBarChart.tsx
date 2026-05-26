/**
 * ContentStatsBarChart — Bar chart showing content count per type.
 * Lazy-loaded via React.lazy() at the call site.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ContentStatsBarChartProps {
  totalContent: number;
  publishedContent: number;
  totalUsers: number;
  totalComments: number;
  viewsLast30Days: number;
}

const BAR_COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function ContentStatsBarChart({
  totalContent,
  publishedContent,
  totalUsers,
  totalComments,
  viewsLast30Days,
}: ContentStatsBarChartProps) {
  const data = [
    { name: 'Beiträge', count: totalContent },
    { name: 'Veröffentlicht', count: publishedContent },
    { name: 'Benutzer', count: totalUsers },
    { name: 'Kommentare', count: totalComments },
    { name: 'Aufrufe (30T)', count: viewsLast30Days },
  ];

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [Number(value).toLocaleString('de-DE'), String(name)]}
            contentStyle={{
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
            }}
          />
          <Bar dataKey="count" name="Anzahl" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
