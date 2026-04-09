/**
 * TrafficLightIndicator — colored dot (green/yellow/red) with label and value.
 *
 * Used in cockpit dashboards to display a single health rule evaluation.
 * Supports compact mode (dot-only) for mobile views.
 */
import { useState } from 'react';
import { COCKPIT_STATUS_COLORS } from '@/schemas/cockpit';
import type { CockpitEvaluation } from '@/schemas/cockpit';

interface TrafficLightIndicatorProps {
  evaluation: CockpitEvaluation;
  /** Compact mode: show dot only, detail on tap (for mobile) */
  compact?: boolean;
}

export default function TrafficLightIndicator({
  evaluation,
  compact = false,
}: TrafficLightIndicatorProps) {
  const [showDetail, setShowDetail] = useState(false);
  const colors = COCKPIT_STATUS_COLORS[evaluation.status] ?? COCKPIT_STATUS_COLORS.green;

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className={`w-3.5 h-3.5 rounded-full ${colors.bg} hover:ring-2 hover:ring-offset-1 hover:ring-${evaluation.status === 'green' ? 'green-400' : evaluation.status === 'yellow' ? 'yellow-300' : 'red-400'} transition-all`}
          title={`${evaluation.rule_name}: ${evaluation.current_value.toFixed(1)} ${evaluation.unit}`}
          aria-label={`${evaluation.rule_name}: ${colors.label}`}
        />
        {showDetail && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDetail(false)}
            />
            <div className="absolute z-50 top-6 left-1/2 -translate-x-1/2 w-56 rounded-xl border bg-card shadow-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.bg} shrink-0`} />
                <span className="font-medium text-sm">{evaluation.rule_name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {evaluation.current_value.toFixed(1)} {evaluation.unit}
              </div>
              {evaluation.status !== 'green' && evaluation.tip_text && (
                <p className="text-xs text-muted-foreground mt-1 border-t pt-1">
                  {evaluation.tip_text}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-3 h-3 rounded-full shrink-0 ${colors.bg}`} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{evaluation.rule_name}</span>
      </div>
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {evaluation.current_value.toFixed(1)} {evaluation.unit}
      </span>
    </div>
  );
}
