import { describe, expect, it } from 'vitest';
import type { MealPlan } from '@/schemas/mealPlan';
import {
  groupPlansForList,
  monthKey,
  planDurationDays,
  planTiming,
  templateDatesError,
  templateEndDatetime,
} from './mealPlanListDisplay';

const NOW = new Date('2026-10-04T12:00:00').getTime();

function plan(start: string | null, end: string | null, id = 0): MealPlan {
  return { id, start_datetime: start, end_datetime: end } as unknown as MealPlan;
}

describe('mealPlanListDisplay', () => {
  it('counts calendar days', () => {
    expect(planDurationDays(plan('2026-10-09T18:00:00', '2026-10-11T14:00:00'))).toBe(3);
    expect(planDurationDays(plan('2026-10-09T08:00:00', '2026-10-09T20:00:00'))).toBe(1);
    expect(planDurationDays(plan(null, null))).toBeNull();
  });

  it('classifies timing', () => {
    expect(planTiming(plan('2026-10-09T18:00:00', '2026-10-11T14:00:00'), NOW)).toBe('upcoming');
    expect(planTiming(plan('2026-10-03T10:00:00', '2026-10-05T10:00:00'), NOW)).toBe('running');
    expect(planTiming(plan('2026-09-01T10:00:00', '2026-09-02T10:00:00'), NOW)).toBe('past');
    expect(planTiming(plan(null, null), NOW)).toBe('undated');
  });

  it('groups by start month', () => {
    expect(monthKey(plan('2026-10-09T18:00:00', null))).toBe('2026-10');
    expect(monthKey(plan(null, null))).toBe('undated');
  });

  it('splits date_upcoming into current and past sections so a month never repeats', () => {
    // Server order for date_upcoming: upcoming ascending, then past descending.
    const plans = [
      plan('2026-10-09T18:00:00', '2026-10-11T14:00:00', 1),
      plan('2026-11-06T18:00:00', '2026-11-08T14:00:00', 2),
      plan('2026-10-01T10:00:00', '2026-10-02T10:00:00', 3),
      plan('2026-09-01T10:00:00', '2026-09-02T10:00:00', 4),
      plan(null, null, 5),
    ];

    const sections = groupPlansForList(plans, 'date_upcoming', NOW);

    expect(sections.map((s) => [s.key, s.title])).toEqual([
      ['current', 'Aktuell & kommend'],
      ['past', 'Vergangen'],
      ['undated', null],
    ]);
    expect(sections[0].months.map((m) => [m.month, m.plans.map((p) => p.id)])).toEqual([
      ['2026-10', [1]],
      ['2026-11', [2]],
    ]);
    expect(sections[1].months.map((m) => [m.month, m.plans.map((p) => p.id)])).toEqual([
      ['2026-10', [3]],
      ['2026-09', [4]],
    ]);
    const keys = sections.flatMap((s) => s.months.map((m) => m.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('merges non-adjacent plans of the same month into one group', () => {
    const plans = [
      plan('2026-10-09T18:00:00', null, 1),
      plan(null, '2026-11-02T10:00:00', 2),
      plan('2026-10-01T10:00:00', null, 3),
    ];

    const [section] = groupPlansForList(plans, 'date_newest', NOW);

    expect(section.title).toBeNull();
    expect(section.months.map((m) => [m.key, m.plans.map((p) => p.id)])).toEqual([
      ['all-2026-10', [1, 3]],
      ['all-2026-11', [2]],
    ]);
  });

  it('does not group name sorts by month', () => {
    const plans = [plan('2026-10-09T18:00:00', null, 1), plan('2026-09-01T10:00:00', null, 2)];

    expect(groupPlansForList(plans, 'name_asc', NOW)).toEqual([
      { key: 'all', title: null, months: [{ key: 'all', month: '', plans }] },
    ]);
  });

  it('prefills the copy end by calendar days with the source end time', () => {
    // Source spans two calendar days (05.10. 08:00 – 06.10. 19:00); an evening start must not add a day.
    const source = plan('2026-10-05T08:00:00', '2026-10-06T19:00:00');

    expect(templateEndDatetime(source, '2026-10-16T18:00')).toBe('2026-10-17T19:00');
    expect(templateEndDatetime(plan('2026-10-09T18:00:00', '2026-10-11T14:00:00'), '2026-10-30T18:00')).toBe(
      '2026-11-01T14:00',
    );
    expect(templateEndDatetime(plan(null, null), '2026-10-16T18:00')).toBeNull();
  });

  it('validates the copy dates against the source day count in German', () => {
    const source = plan('2026-10-05T08:00:00', '2026-10-06T19:00:00');

    expect(templateDatesError(source, '2026-10-16T18:00', '2026-10-17T19:00')).toBeNull();
    expect(templateDatesError(source, '2026-10-16T18:00', '2026-10-18T05:00')).toBe(
      'Der Zeitraum muss wie die Vorlage 2 Tage umfassen (aktuell 3 Tage).',
    );
    expect(templateDatesError(plan('2026-10-05T08:00:00', '2026-10-05T19:00:00'), '2026-10-16T20:00', '2026-10-16T19:00')).toBe(
      'Das Ende muss nach dem Start liegen.',
    );
    expect(templateDatesError(source, '', '')).toBe('Bitte Start und Ende angeben.');
  });
});
