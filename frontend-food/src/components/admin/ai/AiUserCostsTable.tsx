import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserCost } from '@/schemas/aiInteraction';

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
  users: UserCost[];
  onUserClick: (userId: number, userName: string) => void;
}

export default function AiUserCostsTable({ users, onUserClick }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kosten pro Nutzer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Nutzer</th>
                <th className="pb-2 pr-4 text-right">Aufrufe</th>
                <th className="pb-2 pr-4 text-right">Tokens</th>
                <th className="pb-2 pr-4 text-right">Kosten gesamt</th>
                <th className="pb-2 pr-4 text-right">Kosten 30d</th>
                <th className="pb-2 pr-4 text-right">Vote-Rate</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.user_id}
                  className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onUserClick(user.user_id, user.user_name)}
                >
                  <td className="py-2 pr-4 font-medium">{user.user_name}</td>
                  <td className="py-2 pr-4 text-right">{user.total_calls}</td>
                  <td className="py-2 pr-4 text-right">{formatTokens(user.total_tokens)}</td>
                  <td className="py-2 pr-4 text-right">{formatEur(user.total_cost_eur)}</td>
                  <td className="py-2 pr-4 text-right">{formatEur(user.cost_30d_eur)}</td>
                  <td className="py-2 pr-4 text-right">{user.vote_rate}%</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Keine Nutzer mit KI-Aufrufen
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
