import type { MealPlan } from '@/schemas/mealPlan';

const DAY_MS = 24 * 60 * 60 * 1000;

function time(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Calendar days a plan touches (1 for a single day), or null without dates. */
export function planDurationDays(plan: MealPlan): number | null {
  const start = time(plan.start_datetime);
  const end = time(plan.end_datetime) ?? start;
  if (start === null || end === null) return null;
  const startDay = new Date(start);
  const endDay = new Date(end);
  startDay.setHours(0, 0, 0, 0);
  endDay.setHours(0, 0, 0, 0);
  return Math.round((endDay.getTime() - startDay.getTime()) / DAY_MS) + 1;
}

/** Filtering and ordering happen on the server (GET /api/meal-plans/); these helpers only format rows. */
export type PlanTiming = 'upcoming' | 'running' | 'past' | 'undated';

export function planTiming(plan: MealPlan, now: number): PlanTiming {
  const start = time(plan.start_datetime);
  const end = time(plan.end_datetime);
  if (start === null && end === null) return 'undated';
  if (end !== null && end < now) return 'past';
  if (start !== null && start > now) return 'upcoming';
  return 'running';
}

export function monthKey(plan: MealPlan): string {
  const value = plan.start_datetime ?? plan.end_datetime;
  if (!value) return 'undated';
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  if (key === 'undated') return 'Ohne Datum';
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}
