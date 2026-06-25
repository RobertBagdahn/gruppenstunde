import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import type { ScatterOut } from '@/schemas/supply';

interface ScatterExplorerProps {
  data: ScatterOut;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
}

const NUTRI_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};

export default function ScatterExplorer({ data, xLabel, yLabel, xUnit, yUnit }: ScatterExplorerProps) {
  const chartData = data.points.map((p) => ({
    ...p,
    color: p.nutri_class ? NUTRI_COLORS[p.nutri_class] || '#94a3b8' : '#94a3b8',
  }));

  return (
    <div className="space-y-4">
      {data.pearson_r !== null && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Pearson-Korrelation:</span>
          <span className={`font-bold ${Math.abs(data.pearson_r) > 0.5 ? 'text-primary' : 'text-foreground'}`}>
            {data.pearson_r.toFixed(4)}
          </span>
          <span className="text-muted-foreground">
            ({Math.abs(data.pearson_r) > 0.7 ? 'stark' : Math.abs(data.pearson_r) > 0.5 ? 'mittel' : 'schwach'}
            {data.pearson_r > 0 ? ', positiv' : data.pearson_r < 0 ? ', negativ' : ''})
          </span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{data.count} Datenpunkte</p>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 10, right: 20, top: 5, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="x"
              name={xLabel}
              tick={{ fontSize: 11 }}
              label={{ value: `${xLabel} (${xUnit})`, position: 'bottom', fontSize: 11, offset: 10 }}
            />
            <YAxis
              dataKey="y"
              name={yLabel}
              tick={{ fontSize: 11 }}
              label={{ value: `${yLabel} (${yUnit})`, angle: -90, position: 'left', fontSize: 11, offset: 5 }}
            />
            <Tooltip
              formatter={((value: unknown, name: string) => [
                Number(value).toFixed(2),
                name === 'x' ? xLabel : yLabel,
              ]) as never}
              labelFormatter={(l: unknown) => `Zutat: ${(l as { name: string }).name}`}
            />
            <Legend />
            <Scatter data={chartData} shape="circle" fill="hsl(var(--primary))" fillOpacity={0.6}>
              {chartData.map((point, index) => (
                <Cell key={index} fill={point.color} fillOpacity={0.6} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
