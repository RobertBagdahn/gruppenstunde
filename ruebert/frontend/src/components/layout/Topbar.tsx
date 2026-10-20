import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export type PipelineStatus = 'ok' | 'warn' | 'error';

export type PipelineStage = {
  /** Short label, e.g. "Vario-Daten", "Import · 1 Hinweis", "Forecast #128". */
  label: string;
  /** Local time of the last completed step, already formatted ("06:42"). */
  time: string;
  status: PipelineStatus;
};

export type TopbarProps = {
  area: string;
  page: string;
  stages: PipelineStage[];
  /** Date line shown on the right, already formatted ("MO 12.10.2026"). */
  today: string;
};

const DOT: Record<PipelineStatus, string> = {
  ok: 'bg-traffic-green',
  warn: 'bg-traffic-yellow',
  error: 'bg-traffic-red',
};

const STATUS_LABEL: Record<PipelineStatus, string> = { ok: 'in Ordnung', warn: 'Hinweis', error: 'Fehler' };

export function Topbar({ area, page, stages, today }: TopbarProps) {
  return (
    <header className="flex min-h-topbar flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-shell px-5 py-2">
      <nav aria-label="Brotkrumen" className="flex min-w-0 items-center gap-2 text-dense">
        <span className="text-muted-foreground">{area}</span>
        <ChevronRight size={12} className="text-border-strong" aria-hidden />
        <span aria-current="page" className="font-semibold text-foreground-strong">
          {page}
        </span>
      </nav>
      <DataPipeline stages={stages} />
      <Link to="/data/quality" className="text-caption text-link">
        Statusansicht
      </Link>
      <span className="font-mono text-caption uppercase text-foreground-2">{today}</span>
    </header>
  );
}

/** Data freshness: source → import → forecast → traffic light (MON-11). */
export function DataPipeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <ol aria-label="Datenfluss" className="ml-auto flex flex-wrap items-center gap-1.5">
      {stages.map((stage) => (
        <li
          key={stage.label}
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-caption ${
            stage.status === 'ok' ? 'border-border bg-panel' : 'border-warning-border bg-warning-soft'
          }`}
        >
          <span role="img" className={`block size-2 rounded-full ${DOT[stage.status]}`} aria-label={STATUS_LABEL[stage.status]} />
          {stage.label}
          <span className="font-mono text-muted-foreground">{stage.time}</span>
        </li>
      ))}
    </ol>
  );
}
