import { useQuery } from '@tanstack/react-query';

import type { PipelineStage } from '@/components/layout/Topbar';
import { formatDayLine, formatTime, isoWeek, todayIso } from '@/lib/format';
import { statusSchema, type StatusDto } from '@/schemas/status';

import { apiGet } from './client';

export const STATUS_QUERY_KEY = ['status'] as const;

/** Data freshness and navigation counters; refreshed every minute. */
export function useStatus() {
  return useQuery({
    queryKey: STATUS_QUERY_KEY,
    queryFn: ({ signal }) => apiGet('/api/status', statusSchema, signal),
    refetchInterval: 60_000,
  });
}

/** Everything the app shell needs from the status endpoint, already formatted. */
export type ShellStatus = {
  stages: PipelineStage[];
  badges: Partial<Record<string, number>>;
  currentWeek: number | null;
  today: string;
  /** ISO reference date, null while unknown; feedback attaches it as context. */
  referenceDate: string | null;
  user: { name: string; role: string };
};

const GUEST = { name: 'Gast', role: 'ohne Anmeldung' };

export const UNREACHABLE_STAGE: PipelineStage = { label: 'Status nicht erreichbar', time: '–', status: 'error' };

/**
 * Maps the status query to shell props. While loading, the pipeline stays empty; on error, a single
 * red stage says so – decisions must never rest on silently missing freshness information (MON-11).
 */
export function shellStatusFrom(
  query: { data?: StatusDto; isError: boolean },
  now: Date = new Date(),
): ShellStatus {
  if (query.data) {
    const { data } = query;
    return {
      stages: data.stages.map((stage) => ({ label: stage.label, time: formatTime(stage.finished_at), status: stage.status })),
      badges: data.badges,
      currentWeek: data.iso_week,
      today: formatDayLine(data.reference_date),
      referenceDate: data.reference_date,
      user: data.user ?? GUEST,
    };
  }
  return {
    stages: query.isError ? [UNREACHABLE_STAGE] : [],
    badges: {},
    currentWeek: query.isError ? isoWeek(now) : null,
    today: formatDayLine(todayIso(now)),
    referenceDate: null,
    user: GUEST,
  };
}
