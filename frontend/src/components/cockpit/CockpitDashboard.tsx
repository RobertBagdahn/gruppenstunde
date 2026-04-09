/**
 * CockpitDashboard — grid of TrafficLightIndicators with summary and tips.
 *
 * Full cockpit view for MealEvent, day, or meal level.
 * Supports mobile-responsive compact mode.
 */
import type { CockpitDashboard as CockpitDashboardType } from '@/schemas/cockpit';
import CockpitSummaryCard from './CockpitSummaryCard';
import TrafficLightIndicator from './TrafficLightIndicator';
import HealthTipCard from './HealthTipCard';

interface CockpitDashboardProps {
  dashboard: CockpitDashboardType;
  /** Title for the summary card */
  title?: string;
  /** Show indicators in compact mode (dot only, tap for detail) */
  compact?: boolean;
  /** Show health tips below indicators */
  showTips?: boolean;
}

export default function CockpitDashboard({
  dashboard,
  title,
  compact = false,
  showTips = true,
}: CockpitDashboardProps) {
  if (dashboard.evaluations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <span className="material-symbols-outlined text-4xl mb-2 block">speed</span>
        <p>Noch keine Gesundheitsregeln konfiguriert.</p>
      </div>
    );
  }

  const nonGreenEvaluations = dashboard.evaluations.filter(
    (e) => e.status !== 'green' && e.tip_text,
  );

  if (compact) {
    return (
      <div className="space-y-3">
        <CockpitSummaryCard dashboard={dashboard} title={title} compact />
        <div className="flex flex-wrap gap-1.5">
          {dashboard.evaluations.map((evaluation) => (
            <TrafficLightIndicator
              key={evaluation.rule_id}
              evaluation={evaluation}
              compact
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CockpitSummaryCard dashboard={dashboard} title={title} />

      {/* Indicators grid */}
      <div className="grid gap-3">
        {dashboard.evaluations.map((evaluation) => (
          <div
            key={evaluation.rule_id}
            className="rounded-xl border bg-card p-4 flex items-start gap-3"
          >
            <TrafficLightIndicator evaluation={evaluation} />
          </div>
        ))}
      </div>

      {/* Tips section */}
      {showTips && nonGreenEvaluations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
            Empfehlungen
          </h4>
          {nonGreenEvaluations.map((evaluation) => (
            <HealthTipCard key={evaluation.rule_id} evaluation={evaluation} />
          ))}
        </div>
      )}
    </div>
  );
}
