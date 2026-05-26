/**
 * WhatsApp message statistics display (total, today, this week).
 */
import type { WhatsAppStats } from '@/schemas/whatsapp';

interface WhatsAppStatsDisplayProps {
  stats: WhatsAppStats;
}

export default function WhatsAppStatsDisplay({ stats }: WhatsAppStatsDisplayProps) {
  const lastSent = stats.last_sent_at
    ? new Date(stats.last_sent_at).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Noch keine';

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatItem label="Gesamt" value={stats.total_sent} />
      <StatItem label="Heute" value={stats.sent_today} />
      <StatItem label="Diese Woche" value={stats.sent_this_week} />
      <div className="col-span-3 text-xs text-muted-foreground">
        Letzte Nachricht: {lastSent}
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/50">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
