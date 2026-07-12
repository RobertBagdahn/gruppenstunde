import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { AiTimelineEntry } from '@/schemas/aiInteraction';

interface Props {
  timeline: AiTimelineEntry[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
}

export default function AiCostChart({ timeline }: Props) {
  if (timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kosten-Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Keine Daten im gewählten Zeitraum
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kosten-Verlauf</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              labelFormatter={(label) => new Date(label as string).toLocaleDateString('de-DE')}
              formatter={(value) => [
                new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                }).format(Number(value)),
                'Kosten',
              ]}
            />
            <Line
              type="monotone"
              dataKey="total_cost_eur"
              name="Kosten"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-primary rounded-sm" /> Kosten (€)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
