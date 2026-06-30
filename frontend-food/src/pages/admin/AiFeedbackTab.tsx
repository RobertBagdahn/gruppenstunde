import { useAiInteractionStats } from '@/api/aiInteraction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AiFeedbackTab() {
  const { data, isLoading, error } = useAiInteractionStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="h-24 animate-pulse bg-muted rounded-lg" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        KI-Feedback-Statistiken konnten nicht geladen werden.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </div>

      {/* Per-Context Table */}
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
                  <th className="pb-2 pr-4 text-right">👍</th>
                  <th className="pb-2 pr-4 text-right">👎</th>
                  <th className="pb-2 pr-4 text-right">Quote</th>
                  <th className="pb-2 pr-4 text-right">Fehler</th>
                </tr>
              </thead>
              <tbody>
                {data.by_context.map((ctx) => (
                  <tr key={ctx.context} className="border-b last:border-0">
                    <td className="py-2 pr-4">{ctx.label}</td>
                    <td className="py-2 pr-4 text-right">{ctx.total}</td>
                    <td className="py-2 pr-4 text-right text-primary">{ctx.thumbs_up}</td>
                    <td className="py-2 pr-4 text-right text-destructive">{ctx.thumbs_down}</td>
                    <td className="py-2 pr-4 text-right">{ctx.vote_rate}%</td>
                    <td className="py-2 pr-4 text-right text-destructive">{ctx.error_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Zeitverlauf (letzte 30 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {data.timeline.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Keine Daten in den letzten 30 Tagen
              </p>
            )}
            {data.timeline.map((entry) => (
              <div key={entry.date} className="flex items-center gap-2 text-sm">
                <span className="w-24 text-muted-foreground shrink-0">
                  {new Date(entry.date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
                <div className="flex items-center gap-1 flex-1">
                  <div
                    className="h-3 bg-primary rounded-sm transition-all"
                    style={{
                      width: `${entry.total > 0 ? (entry.thumbs_up / entry.total) * 100 : 0}%`,
                      minWidth: entry.thumbs_up > 0 ? '4px' : '0',
                    }}
                  />
                  <div
                    className="h-3 bg-destructive rounded-sm transition-all"
                    style={{
                      width: `${entry.total > 0 ? (entry.thumbs_down / entry.total) * 100 : 0}%`,
                      minWidth: entry.thumbs_down > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{entry.total}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-primary rounded-sm" /> Positive
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-destructive rounded-sm" /> Negative
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
