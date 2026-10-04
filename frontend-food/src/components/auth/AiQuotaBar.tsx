/**
 * Shows the daily AI budget as a percentage (EUR only for staff).
 */
import { Sparkles } from 'lucide-react';
import { formatEuro } from '@/lib/format';
import { useAiQuota } from '@/api/ai';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function AiQuotaBar({ showEuro = false, className }: { showEuro?: boolean; className?: string }) {
  const { data: quota } = useAiQuota();
  if (!quota || quota.tier === 'anonymous') return null;
  const exhausted = quota.used_percent >= 100;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-caption text-muted-foreground">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          KI heute: {quota.used_percent} % genutzt
        </span>
        {showEuro && (
          <span>
            {formatEuro(quota.used_eur)} / {formatEuro(quota.limit_eur)}
          </span>
        )}
      </div>
      <Progress
        value={Math.min(100, quota.used_percent)}
        aria-label="KI-Kontingent"
        className={cn('h-1.5 bg-muted', exhausted && '[&>div]:bg-destructive')}
      />
      <p className="text-caption text-muted-foreground">
        {exhausted ? 'Aufgebraucht' : 'Wieder voll'} um {formatTime(quota.resets_at)} Uhr
      </p>
    </div>
  );
}
