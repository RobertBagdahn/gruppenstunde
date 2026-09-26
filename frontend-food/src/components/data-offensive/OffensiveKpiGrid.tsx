import type { OffensiveSummary } from '@/schemas/dataOffensive';
import { cn } from '@/lib/utils';
import { CRITICAL_ISSUES, KPI_ISSUES } from './offensiveMeta';

interface OffensiveKpiGridProps {
  summary: OffensiveSummary;
  activeIssue: string | undefined;
  onSelectIssue: (issue: string | undefined) => void;
}

/** Clickable issue counters; a click filters the work list below. */
export default function OffensiveKpiGrid({ summary, activeIssue, onSelectIssue }: OffensiveKpiGridProps) {
  const published = summary.status_counts.verified ?? 0;
  const tiles = [
    { key: 'publishable', label: 'Bereit zum Veröffentlichen', count: summary.publishable, critical: false },
    ...KPI_ISSUES.map((key) => ({
      key,
      label: summary.issue_labels[key] ?? key,
      count: summary.issue_counts[key] ?? 0,
      critical: CRITICAL_ISSUES.has(key),
    })),
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Zustand der Zutaten</h2>
        <p className="text-xs text-muted-foreground">
          {summary.total.toLocaleString('de-DE')} Zutaten · {published.toLocaleString('de-DE')} veröffentlicht
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => {
          const active = activeIssue === tile.key;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => onSelectIssue(active ? undefined : tile.key)}
              aria-pressed={active}
              className={cn(
                'rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40',
                active && 'border-primary ring-1 ring-primary'
              )}
            >
              <p
                className={cn(
                  'font-display text-xl font-bold tabular-nums',
                  tile.count === 0 ? 'text-muted-foreground' : tile.critical ? 'text-destructive' : 'text-foreground'
                )}
              >
                {tile.count.toLocaleString('de-DE')}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">{tile.label}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
