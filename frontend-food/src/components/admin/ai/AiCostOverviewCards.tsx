import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AiInteractionStats } from '@/schemas/aiInteraction';

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTokens(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value);
}

interface Props {
  data: AiInteractionStats;
}

export default function AiCostOverviewCards({ data }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Gesamt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.total_calls}</p>
          <p className="text-xs text-muted-foreground">KI-Aufrufe insgesamt</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Heute</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.calls_today}</p>
          <p className="text-xs text-muted-foreground">davon heute</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Bewertet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.voted_calls}</p>
          <p className="text-xs text-muted-foreground">mit Feedback</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Feedback-Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.vote_rate}%</p>
          <p className="text-xs text-muted-foreground">bewertet / gesamt</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Gesamtkosten</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatEur(data.total_cost_eur)}</p>
          <p className="text-xs text-muted-foreground">alle KI-Aufrufe</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Token-Verbrauch</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatTokens(data.total_tokens_all)}</p>
          <p className="text-xs text-muted-foreground">Token insgesamt</p>
        </CardContent>
      </Card>
    </div>
  );
}
