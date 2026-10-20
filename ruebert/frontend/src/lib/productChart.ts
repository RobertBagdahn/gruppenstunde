// Maps the article detail (history and forecast from the API) onto the chart's points. No business rules here:
// the API decides what is capped, excluded or out of stock; this only renames fields.

import type { ChartPoint } from '@/components/charts/ForecastChart';

export type HistoryRow = { week_start: string; total: number; excluded: boolean };
export type ForecastRow = { week_start: string; quantity: number; lower_80: number | null; upper_80: number | null; capped: boolean };

export function chartPoints(history: HistoryRow[], forecast: ForecastRow[]): ChartPoint[] {
  const past: ChartPoint[] = history.map((h) => ({ date: h.week_start, sales: h.total, excluded: h.excluded }));
  const future: ChartPoint[] = forecast.map((f) => ({
    date: f.week_start,
    forecast: f.quantity,
    p10: f.lower_80 ?? undefined,
    p90: f.upper_80 ?? undefined,
    capped: f.capped,
  }));
  return [...past, ...future];
}
