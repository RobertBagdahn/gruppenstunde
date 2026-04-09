/**
 * CockpitSummaryCard — overall health status banner showing worst status
 * and counts of green/yellow/red rules.
 */
import { COCKPIT_STATUS_COLORS } from '@/schemas/cockpit';
import type { CockpitDashboard } from '@/schemas/cockpit';

interface CockpitSummaryCardProps {
  dashboard: CockpitDashboard;
  /** Optional title (defaults to "Gesamtstatus") */
  title?: string;
  /** Compact variant for inline display */
  compact?: boolean;
}

export default function CockpitSummaryCard({
  dashboard,
  title = 'Gesamtstatus',
  compact = false,
}: CockpitSummaryCardProps) {
  const colors = COCKPIT_STATUS_COLORS[dashboard.summary_status] ?? COCKPIT_STATUS_COLORS.green;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
        <span className="text-xs font-medium">{colors.label}</span>
        <span className="text-xs text-muted-foreground">
          ({dashboard.green_count}/{dashboard.yellow_count}/{dashboard.red_count})
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${colors.bg} ${colors.text}`}>
      <span className="material-symbols-outlined text-2xl">speed</span>
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{title}: {colors.label}</span>
        <div className="flex items-center gap-3 mt-0.5 text-sm opacity-80">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-300 inline-block" />
            {dashboard.green_count} gut
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-300 inline-block" />
            {dashboard.yellow_count} Achtung
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-300 inline-block" />
            {dashboard.red_count} kritisch
          </span>
        </div>
      </div>
    </div>
  );
}
