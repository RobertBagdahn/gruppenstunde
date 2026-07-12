import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AiContextStats } from '@/schemas/aiInteraction';

function formatEur(value: number): string {
  if (value === 0) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTokens(value: number): string {
  if (value === 0) return '—';
  return new Intl.NumberFormat('de-DE').format(value);
}

interface Props {
  contexts: AiContextStats[];
}

export default function AiContextTable({ contexts }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auswertung nach Kontext</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Kontext</th>
                <th className="pb-2 pr-4 text-right">Aufrufe</th>
                <th className="pb-2 pr-4 text-right">Tokens</th>
                <th className="pb-2 pr-4 text-right">Kosten</th>
                <th className="pb-2 pr-4 text-right">👍</th>
                <th className="pb-2 pr-4 text-right">👎</th>
                <th className="pb-2 pr-4 text-right">Quote</th>
                <th className="pb-2 pr-4 text-right">Fehler</th>
              </tr>
            </thead>
            <tbody>
              {contexts.map((ctx) => (
                <tr key={ctx.context} className="border-b last:border-0">
                  <td className="py-2 pr-4">{ctx.label}</td>
                  <td className="py-2 pr-4 text-right">{ctx.total}</td>
                  <td className="py-2 pr-4 text-right">{formatTokens(ctx.total_tokens)}</td>
                  <td className="py-2 pr-4 text-right">{formatEur(ctx.total_cost_eur)}</td>
                  <td className="py-2 pr-4 text-right text-primary">{ctx.thumbs_up}</td>
                  <td className="py-2 pr-4 text-right text-destructive">{ctx.thumbs_down}</td>
                  <td className="py-2 pr-4 text-right">{ctx.vote_rate}%</td>
                  <td className="py-2 pr-4 text-right text-destructive">{ctx.error_count}</td>
                </tr>
              ))}
              {contexts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Keine Daten im gewählten Zeitraum
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
