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

export type PlanListSectionKey = 'current' | 'past' | 'undated' | 'all';

export interface PlanMonthGroup {
  /** Unique React key: section plus month. */
  key: string;
  /** `monthKey()` of the plans, or '' when the list is not grouped by month. */
  month: string;
  plans: MealPlan[];
}

export interface PlanListSection {
  key: PlanListSectionKey;
  title: string | null;
  months: PlanMonthGroup[];
}

const SECTION_TITLE: Record<PlanListSectionKey, string | null> = {
  current: 'Aktuell & kommend',
  past: 'Vergangen',
  undated: null,
  all: null,
};

function sectionKey(plan: MealPlan, sort: string, now: number): PlanListSectionKey {
  if (sort !== 'date_upcoming') return 'all';
  const timing = planTiming(plan, now);
  if (timing === 'past') return 'past';
  if (timing === 'undated') return 'undated';
  return 'current';
}

/**
 * Groups the server-ordered list for display. `date_upcoming` returns upcoming plans
 * ascending and past plans descending, so the same month can appear in both parts:
 * plans are split into sections first and grouped by month within each section.
 * Month groups are unique per section, whatever the server order.
 */
export function groupPlansForList(plans: MealPlan[], sort: string, now: number): PlanListSection[] {
  if (!sort.startsWith('date_')) {
    return [{ key: 'all', title: null, months: [{ key: 'all', month: '', plans }] }];
  }
  const sections = new Map<PlanListSectionKey, Map<string, MealPlan[]>>();
  for (const plan of plans) {
    const section = sectionKey(plan, sort, now);
    const months = sections.get(section) ?? new Map<string, MealPlan[]>();
    sections.set(section, months);
    const month = monthKey(plan);
    months.set(month, [...(months.get(month) ?? []), plan]);
  }
  return [...sections].map(([section, months]) => ({
    key: section,
    title: SECTION_TITLE[section],
    months: [...months].map(([month, monthPlans]) => ({ key: `${section}-${month}`, month, plans: monthPlans })),
  }));
}

/** Formats a date as the value of an `<input type="datetime-local">` (local time). */
export function toDatetimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Calendar days from start to end (1 for the same day), or null for invalid values. */
export function calendarDaysBetween(start: string, end: string): number | null {
  return planDurationDays({ start_datetime: start, end_datetime: end } as MealPlan);
}

/**
 * End of a plan copied from `source`: the duplicate endpoint requires the same number
 * of calendar days, so the end lies (source days − 1) days after the new start date,
 * at the source's end time.
 */
export function templateEndDatetime(source: MealPlan, targetStart: string): string | null {
  const days = planDurationDays(source);
  const sourceEnd = time(source.end_datetime);
  const start = time(targetStart);
  if (days === null || sourceEnd === null || start === null) return null;
  const end = new Date(start);
  const sourceEndDate = new Date(sourceEnd);
  end.setDate(end.getDate() + days - 1);
  end.setHours(sourceEndDate.getHours(), sourceEndDate.getMinutes(), 0, 0);
  return toDatetimeLocalValue(end);
}

/** German validation message for the copy dialog dates, or null when they fit the source. */
export function templateDatesError(source: MealPlan, start: string, end: string): string | null {
  const sourceDays = planDurationDays(source);
  const targetDays = calendarDaysBetween(start, end);
  const startMs = time(start);
  const endMs = time(end);
  if (targetDays === null || startMs === null || endMs === null) return 'Bitte Start und Ende angeben.';
  if (endMs <= startMs) return 'Das Ende muss nach dem Start liegen.';
  if (sourceDays !== null && targetDays !== sourceDays) {
    const daysLabel = (n: number) => `${n} ${n === 1 ? 'Tag' : 'Tage'}`;
    return `Der Zeitraum muss wie die Vorlage ${daysLabel(sourceDays)} umfassen (aktuell ${daysLabel(targetDays)}).`;
  }
  return null;
}
