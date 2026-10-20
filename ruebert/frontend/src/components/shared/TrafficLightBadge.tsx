import type { TrafficColor } from '@/components/layout/SidebarControls';

/** The only place where a traffic colour is shown: a dot with its meaning as text (Design.md). */
export const TRAFFIC_LABELS: Record<TrafficColor, string> = {
  red: 'Dringend',
  yellow: 'Einplanen',
  green: 'In Ordnung',
  blue: 'Überbestand',
};

const DOT: Record<TrafficColor, string> = {
  red: 'bg-traffic-red',
  yellow: 'bg-traffic-yellow',
  green: 'bg-traffic-green',
  blue: 'bg-traffic-blue',
};

/** Pass `label=""` to show only the dot inside a row that already names the item. */
export function TrafficLightBadge({ colour, label }: { colour: TrafficColor; label?: string }) {
  const text = label ?? TRAFFIC_LABELS[colour];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-dense text-foreground-2">
      <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${DOT[colour]}`} />
      {text && <span>{text}</span>}
      {!text && <span className="sr-only">{TRAFFIC_LABELS[colour]}</span>}
    </span>
  );
}
