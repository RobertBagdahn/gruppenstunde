import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { RankingItem } from '@/schemas/supply';

interface LeaderboardTableProps {
  top: RankingItem[];
  bottom: RankingItem[];
  count: number;
  unit: string;
}

export default function LeaderboardTable({ top, bottom, count, unit }: LeaderboardTableProps) {
  const [showTop, setShowTop] = useState(true);
  const items = showTop ? top : bottom;
  const label = showTop ? 'Top 20' : 'Bottom 20';

  const chartData = items.map((item) => ({
    name: item.name.length > 25 ? item.name.slice(0, 22) + '...' : item.name,
    value: item.value,
    fullName: item.name,
    slug: item.slug,
    nutri_class: item.nutri_class,
    retail_section_name: item.retail_section_name,
  }));

  const NUTRI_CLASS_COLORS: Record<number, string> = {
    1: '#22c55e',
    2: '#84cc16',
    3: '#eab308',
    4: '#f97316',
    5: '#ef4444',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {count} verifizierte Zutaten mit Werten &gt; 0
        </p>
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setShowTop(true)}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              showTop ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            Top 20
          </button>
          <button
            onClick={() => setShowTop(false)}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              !showTop ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            Bottom 20
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={((value: unknown) => [`${Number(value).toFixed(1)} ${unit}`, label]) as never}
              labelFormatter={((label: unknown) => `Zutat: ${label}`) as never}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.nutri_class ? NUTRI_CLASS_COLORS[entry.nutri_class] || '#94a3b8' : '#94a3b8'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 px-3 font-medium">#</th>
              <th className="text-left py-2 px-3 font-medium">Zutat</th>
              <th className="text-right py-2 px-3 font-medium">{unit}</th>
              <th className="text-center py-2 px-3 font-medium hidden sm:table-cell">Nutri</th>
              <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Abteilung</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-2 px-3 text-muted-foreground">{showTop ? i + 1 : count - items.length + i + 1}</td>
                <td className="py-2 px-3">
                  <Link to={`/ingredients/${item.slug}`} className="text-primary hover:underline font-medium">
                    {item.name}
                  </Link>
                </td>
                <td className="py-2 px-3 text-right font-mono text-xs">{item.value.toFixed(1)}</td>
                <td className="py-2 px-3 text-center hidden sm:table-cell">
                  {item.nutri_class ? (
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: NUTRI_CLASS_COLORS[item.nutri_class] || '#94a3b8' }}
                    >
                      {['', 'A', 'B', 'C', 'D', 'E'][item.nutri_class]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </td>
                <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">
                  {item.retail_section_name || '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
