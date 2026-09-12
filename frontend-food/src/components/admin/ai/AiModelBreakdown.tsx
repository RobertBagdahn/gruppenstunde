import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AiModelStats } from '@/schemas/aiInteraction';

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

export default function AiModelBreakdown({ models }: { models: AiModelStats[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auswertung nach Modell</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Modell</th>
                <th className="pb-2 pr-4 text-right">Aufrufe</th>
                <th className="pb-2 pr-4 text-right">Tokens</th>
                <th className="pb-2 pr-4 text-right">Kosten</th>
                <th className="pb-2 pr-4 text-right">👍</th>
                <th className="pb-2 pr-4 text-right">👎</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.model || 'unknown'} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{model.model || 'Unbekannt'}</td>
                  <td className="py-2 pr-4 text-right">{model.total_calls}</td>
                  <td className="py-2 pr-4 text-right">{formatTokens(model.total_tokens)}</td>
                  <td className="py-2 pr-4 text-right">{formatEur(model.total_cost_eur)}</td>
                  <td className="py-2 pr-4 text-right text-primary">{model.thumbs_up}</td>
                  <td className="py-2 pr-4 text-right text-destructive">{model.thumbs_down}</td>
                </tr>
              ))}
              {models.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
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
