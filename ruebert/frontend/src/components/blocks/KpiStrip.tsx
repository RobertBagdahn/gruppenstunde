import { Sparkline } from '@/components/charts/Sparkline';
import type { TrafficColor } from '@/components/layout/SidebarControls';
import { TrafficLightBadge } from '@/components/shared/TrafficLightBadge';
import { formatInt } from '@/lib/format';

export type KpiItem = {
  colour: TrafficColor;
  label?: string;
  count: number;
  /** Change against last week; omitted when unknown. */
  deltaVsLastWeek?: number;
  /** Up to 12 weekly values, oldest first, drawn as a sparkline. */
  history?: number[];
};

/** Ampel counts for the start page: count, change to last week and a 12-week sparkline per colour. */
export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border-row min-[880px]:grid-cols-4">
      {items.map((item) => (
        <div key={item.colour} className="flex flex-col gap-1.5 bg-shell px-4 py-3">
          <TrafficLightBadge colour={item.colour} label={item.label} />
          <div className="flex items-end justify-between gap-3">
            <span className="font-mono text-section font-semibold text-foreground-strong">{formatInt(item.count)}</span>
            {item.history && item.history.length > 0 && <Sparkline values={item.history} colour={item.colour} />}
          </div>
          {item.deltaVsLastWeek !== undefined && (
            <span className="font-mono text-caption text-muted-foreground">
              {item.deltaVsLastWeek > 0 ? '+' : ''}
              {formatInt(item.deltaVsLastWeek)} zur Vorwoche
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
