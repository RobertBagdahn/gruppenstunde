import type { TrafficColor } from '@/components/layout/SidebarControls';
import { formatInt } from '@/lib/format';

import { TrafficLightBadge } from '@/components/shared/TrafficLightBadge';

export type QueueKind = 'Bestellen' | 'Freigeben' | 'Fall';

export type QueueItemProps = {
  /** Traffic colour of the item; cases have none and show no dot. */
  colour?: TrafficColor;
  title: string;
  sku: string;
  /** Deadline text, e.g. "bis KW 44". */
  due?: string;
  kind: QueueKind;
  /** Second line: why it is in the queue. */
  context?: string;
  quantity?: number;
  selected: boolean;
  onSelect: () => void;
};

/** One row of the decision queue. A real button, so keyboard users can reach every entry (Design.md). */
export function QueueItem({ colour, title, sku, due, kind, context, quantity, selected, onSelect }: QueueItemProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex w-full flex-col gap-1 border-b border-border-row px-4 py-3 text-left ${
        selected ? 'bg-row-active shadow-[inset_2px_0_0_hsl(var(--accent))]' : 'hover:bg-row-hover'
      }`}
    >
      <div className="flex items-center gap-2">
        {colour && <TrafficLightBadge colour={colour} label="" />}
        <span className="truncate text-emphasis font-medium text-foreground-strong">{title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
        <span className="rounded-sm border border-border px-1.5 text-label uppercase text-foreground-2">{kind}</span>
        <span className="font-mono">{sku}</span>
        {quantity !== undefined && <span className="font-mono">{formatInt(quantity)} Tüten</span>}
        {due && <span>{due}</span>}
      </div>
      {context && <p className="text-caption text-muted-foreground">{context}</p>}
    </button>
  );
}
