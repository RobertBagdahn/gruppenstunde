// Pure geometry for SVG charts: maps values to pixels, builds paths. No DOM, so it is unit-tested directly.

export type Box = { width: number; height: number; padding: number };

/** X position of the point at `index` out of `count` points, spread evenly across the inner width. */
export function xAt(index: number, count: number, box: Box): number {
  const inner = box.width - 2 * box.padding;
  if (count <= 1) return box.padding;
  return box.padding + (index / (count - 1)) * inner;
}

/** Y position of `value` on a scale from 0 to `max` (inverted: larger values are higher up). */
export function yAt(value: number, max: number, box: Box): number {
  const inner = box.height - 2 * box.padding;
  if (max <= 0) return box.height - box.padding;
  const clamped = Math.min(Math.max(value, 0), max);
  return box.height - box.padding - (clamped / max) * inner;
}

/** Open polyline through the given points; `null` values break the line. */
export function linePath(points: ({ x: number; y: number } | null)[]): string {
  let path = '';
  let open = false;
  for (const point of points) {
    if (point === null) {
      open = false;
      continue;
    }
    path += `${open ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)} `;
    open = true;
  }
  return path.trim();
}

/** Closed band between an upper and a lower line, drawn as one polygon. */
export function bandPath(upper: { x: number; y: number }[], lower: { x: number; y: number }[]): string {
  if (upper.length === 0) return '';
  const forward = upper.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  const back = [...lower].reverse().map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  return `M${[...forward, ...back].join(' L')} Z`;
}

/** Index range [from, to] (inclusive) that starts at the first index whose date is not before `from`. */
export function indexFrom(dates: string[], from: string): number {
  const found = dates.findIndex((d) => d >= from);
  return found === -1 ? dates.length : found;
}
