import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAiUserInteractions } from '@/api/aiInteraction';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { AiInteractionItem } from '@/schemas/aiInteraction';
import { AiContextChoices } from '@/lib/aiContextLabels';

function formatEur(value: number | null): string {
  if (value === null || value === 0) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms >= 1_000) {
    return `${(ms / 1_000).toFixed(1).replace('.', ',')} s`;
  }
  return `${new Intl.NumberFormat('de-DE').format(ms)} ms`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

export default function AiUserCallsModal({ open, onClose, userId, userName }: Props) {
  const { data, isLoading, isError } = useAiUserInteractions(userId, 1);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KI-Aufrufe von {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {isError && (
            <p className="text-center text-destructive py-4">
              Fehler beim Laden der KI-Aufrufe
            </p>
          )}
          {data && data.items.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Keine KI-Aufrufe gefunden
            </p>
          )}
          {data && data.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Datum</th>
                    <th className="pb-2 pr-3">Kontext</th>
                    <th className="pb-2 pr-3 text-right">Tokens</th>
                    <th className="pb-2 pr-3 text-right">Kosten</th>
                    <th className="pb-2 pr-3 text-right">Dauer</th>
                    <th className="pb-2 pr-3 text-center">Vote</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: AiInteractionItem) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 pr-3">
                        {AiContextChoices[item.context] || item.context}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {item.total_tokens !== null
                          ? new Intl.NumberFormat('de-DE').format(item.total_tokens)
                          : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right">{formatEur(item.cost_eur)}</td>
                      <td className="py-2 pr-3 text-right">{formatDuration(item.duration_ms)}</td>
                      <td className="py-2 pr-3 text-center">
                        {item.vote === 'up' && '👍'}
                        {item.vote === 'down' && '👎'}
                        {!item.vote && '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.page < data.total_pages && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm">
                Mehr laden
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
