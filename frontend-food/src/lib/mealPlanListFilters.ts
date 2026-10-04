import type { MealPlan } from '@/schemas/mealPlan';

export interface MealPlanListFilters {
  when: string;
  size: string;
  duration: string;
  visibility: string;
  withMembers: boolean;
  withEvent: boolean;
  tags: string[];
}

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

export type PlanTiming = 'upcoming' | 'running' | 'past' | 'undated';

export function planTiming(plan: MealPlan, now: number): PlanTiming {
  const start = time(plan.start_datetime);
  const end = time(plan.end_datetime);
  if (start === null && end === null) return 'undated';
  if (end !== null && end < now) return 'past';
  if (start !== null && start > now) return 'upcoming';
  return 'running';
}

export function matchesMealPlanFilters(plan: MealPlan, filters: MealPlanListFilters, now: number): boolean {
  if (filters.when !== 'all') {
    const timing = planTiming(plan, now);
    if (filters.when === 'upcoming' && timing !== 'upcoming' && timing !== 'undated') return false;
    if (filters.when === 'running' && timing !== 'running') return false;
    if (filters.when === 'past' && timing !== 'past') return false;
  }
  if (filters.size === 'small' && plan.norm_portions > 15) return false;
  if (filters.size === 'medium' && (plan.norm_portions <= 15 || plan.norm_portions > 40)) return false;
  if (filters.size === 'large' && plan.norm_portions <= 40) return false;
  if (filters.duration !== 'all') {
    const days = planDurationDays(plan);
    if (days === null) return false;
    if (filters.duration === 'day' && days !== 1) return false;
    if (filters.duration === 'weekend' && (days < 2 || days > 3)) return false;
    if (filters.duration === 'week' && days < 4) return false;
  }
  if (filters.visibility !== 'all' && plan.visibility !== filters.visibility) return false;
  if (filters.withMembers && !plan.has_group_members) return false;
  if (filters.withEvent && !plan.event_name) return false;
  if (filters.tags.length > 0 && !filters.tags.every((tag) => plan.nutritional_tag_names.includes(tag))) {
    return false;
  }
  return true;
}

/**
 * Chronological order. `date_upcoming` lists running and upcoming plans by
 * start date, then past plans with the most recent first; undated plans last.
 */
export function sortMealPlansByDate(plans: MealPlan[], sort: string, now: number): MealPlan[] {
  const start = (plan: MealPlan) => time(plan.start_datetime) ?? time(plan.end_datetime);
  const rank = (plan: MealPlan) => {
    const timing = planTiming(plan, now);
    return timing === 'undated' ? 2 : timing === 'past' ? 1 : 0;
  };
  return [...plans].sort((a, b) => {
    const aStart = start(a);
    const bStart = start(b);
    if (aStart === null || bStart === null) return (aStart === null ? 1 : 0) - (bStart === null ? 1 : 0);
    if (sort === 'date_oldest') return aStart - bStart;
    if (sort === 'date_newest') return bStart - aStart;
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return rank(a) === 1 ? bStart - aStart : aStart - bStart;
  });
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
