import { formatInt } from '@/lib/format';
import { bandPath, indexFrom, linePath, xAt, yAt, type Box } from '@/lib/chartGeometry';
import { week } from '@/lib/week';

export type ChartPoint = {
  /** ISO Monday of the week. */
  date: string;
  /** Sales actually booked; absent in the forecast horizon. */
  sales?: number;
  /** Median forecast (P50). */
  forecast?: number;
  /** 80 % interval, P10 and P90. */
  p10?: number;
  p90?: number;
  /** The forecast of this week was capped in v1. */
  capped?: boolean;
  /** Excluded by a case decision: shown hollow and not used. */
  excluded?: boolean;
};

export type ChartMarker = { date: string; label: string };

const BOX: Box = { width: 720, height: 240, padding: 16 };

/**
 * Weekly sales, forecast and the "80-%-Bereich". Everything after `outOfStockFrom` is red when no order is placed,
 * as the traffic light assumes. Markers name the calendar events (layout D, UI-04).
 */
export function ForecastChart({
  points,
  markers = [],
  outOfStockFrom,
  title,
}: {
  points: ChartPoint[];
  markers?: ChartMarker[];
  outOfStockFrom?: string;
  title: string;
}) {
  const dates = points.map((p) => p.date);
  const max = Math.max(1, ...points.flatMap((p) => [p.sales ?? 0, p.p90 ?? 0, p.forecast ?? 0]));
  const x = (i: number) => xAt(i, points.length, BOX);
  const y = (v: number) => yAt(v, max, BOX);

  const sales = points.map((p, i) => (p.sales === undefined ? null : { x: x(i), y: y(p.sales) }));
  const forecast = points.map((p, i) => (p.forecast === undefined ? null : { x: x(i), y: y(p.forecast) }));
  const withBand = points.map((p, i) => ({ i, p })).filter(({ p }) => p.p10 !== undefined && p.p90 !== undefined);
  const band = bandPath(
    withBand.map(({ i, p }) => ({ x: x(i), y: y(p.p90 ?? 0) })),
    withBand.map(({ i, p }) => ({ x: x(i), y: y(p.p10 ?? 0) })),
  );

  const oosIndex = outOfStockFrom ? indexFrom(dates, outOfStockFrom) : points.length;
  const oosWidth = BOX.width - BOX.padding - x(Math.min(oosIndex, points.length - 1));

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">{title}</figcaption>
      <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} role="img" aria-label={title} className="w-full overflow-visible">
        {oosIndex < points.length && (
          <rect x={x(oosIndex)} y={BOX.padding} width={Math.max(0, oosWidth)} height={BOX.height - 2 * BOX.padding} className="fill-chart-oos" />
        )}
        <line x1={BOX.padding} x2={BOX.width - BOX.padding} y1={y(0)} y2={y(0)} className="stroke-chart-grid" />
        {band && <path d={band} className="fill-chart-band" />}
        {markers.map((m) => {
          const index = indexFrom(dates, m.date);
          if (index >= points.length) return null;
          return (
            <g key={`${m.date}-${m.label}`}>
              <line x1={x(index)} x2={x(index)} y1={BOX.padding} y2={BOX.height - BOX.padding} className="stroke-chart-grid" strokeDasharray="2 4" />
              <text x={x(index) + 4} y={BOX.padding + 10} className="fill-muted-foreground text-caption">
                {m.label}
              </text>
            </g>
          );
        })}
        <path d={linePath(sales)} fill="none" strokeWidth={2} className="stroke-foreground-2" />
        <path d={linePath(forecast)} fill="none" strokeWidth={2} strokeDasharray="6 4" style={{ stroke: 'hsl(var(--accent))' }} />
        {points.map((p, i) =>
          p.capped || p.excluded ? (
            <circle
              key={p.date}
              cx={x(i)}
              cy={p.forecast !== undefined ? y(p.forecast) : y(p.sales ?? 0)}
              r={3}
              fill={p.excluded ? 'none' : 'hsl(var(--warning-text))'}
              stroke={p.excluded ? 'hsl(var(--muted-foreground))' : 'hsl(var(--warning-text))'}
            >
              <title>{`${week(p.date)}${p.capped ? ' · gekappt' : ''}${p.excluded ? ' · ausgeschlossen' : ''}`}</title>
            </circle>
          ) : null,
        )}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
        <li>Absatz</li>
        <li style={{ color: 'hsl(var(--accent-text))' }}>Prognose (Median)</li>
        <li>80-%-Bereich</li>
        <li className="text-chart-oos">ohne Bestellung ausverkauft</li>
        {points.some((p) => p.capped) && <li>gekappt</li>}
        {points.some((p) => p.excluded) && <li>ausgeschlossen</li>}
        {points.length > 0 && <li className="font-mono">Maximum {formatInt(max)}</li>}
      </ul>
    </figure>
  );
}
