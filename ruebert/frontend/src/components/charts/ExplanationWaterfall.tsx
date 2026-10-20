import { formatInt } from '@/lib/format';

export type WaterfallStep = {
  key: string;
  label: string;
  /** Change this step makes; the first step has delta = value. */
  delta: number;
  /** Running value after this step. */
  value: number;
  note?: string;
};

/**
 * Derivation of one suggestion as horizontal bars. Positive contributions are accent, reductions warning yellow;
 * the closing row is the planner quantity itself, so the chart cannot disagree with the order table.
 */
export function ExplanationWaterfall({ steps, result, unit = 'Tüten' }: { steps: WaterfallStep[]; result: number; unit?: string }) {
  const scale = Math.max(1, ...steps.map((s) => Math.abs(s.delta)), result);
  return (
    <ol aria-label="Herleitung" className="flex flex-col gap-2">
      {steps.map((step) => {
        const start = step.delta >= 0 ? step.value - step.delta : step.value;
        const width = (Math.abs(step.delta) / scale) * 100;
        const left = (Math.max(0, start) / scale) * 100;
        return (
          <li key={step.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-3 text-dense">
            <span className="truncate text-foreground-2">{step.label}</span>
            <span className="relative h-3 rounded-sm bg-chart-grid" aria-hidden>
              <span
                className={`absolute top-0 h-3 rounded-sm ${step.delta >= 0 ? 'bg-accent' : 'bg-traffic-yellow'}`}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </span>
            <span className="text-right font-mono text-foreground-strong">
              {step.delta > 0 ? '+' : ''}
              {formatInt(step.delta)}
            </span>
            {step.note && <span className="col-start-2 text-caption text-muted-foreground">{step.note}</span>}
          </li>
        );
      })}
      <li className="mt-1 flex items-center justify-between border-t border-border pt-2 text-emphasis font-semibold text-foreground-strong">
        <span>Ergebnis</span>
        <span className="font-mono">
          {formatInt(result)} {unit}
        </span>
      </li>
    </ol>
  );
}
