import { useAiUserCosts } from '@/api/aiInteraction';

export default function KiKostenPage() {
  const { data, isLoading, error } = useAiUserCosts();

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Fehler beim Laden der KI-Kosten.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">KI-Kosten pro Nutzer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kostenübersicht aller KI-Aufrufe (nur Nutzer-Interaktionen, ohne System-Hintergrundaufgaben)
          </p>
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">{data.length} Nutzer</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-muted animate-pulse h-16" />
          ))}
        </div>
      ) : data && data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <span className="material-symbols-outlined text-4xl mb-2 block">euro</span>
          <p className="text-lg font-medium">Keine Kosten vorhanden</p>
          <p className="text-sm mt-1">Es wurden noch keine KI-Aufrufe von Nutzern getätigt.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted">
                <th className="text-left px-4 py-3 text-sm font-medium">Nutzer</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Aufrufe</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Tokens</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Kosten (Gesamt)</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Kosten (30 Tage)</th>
                <th className="text-right px-4 py-3 text-sm font-medium">👍 Quote</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((user) => (
                <tr key={user.user_id} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-medium">{user.user_name}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{user.total_calls.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{user.total_tokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums font-medium">{user.total_cost_eur.toFixed(6)} €</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{user.cost_30d_eur.toFixed(6)} €</td>
                  <td className="px-4 py-3 text-sm text-right">{user.vote_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
