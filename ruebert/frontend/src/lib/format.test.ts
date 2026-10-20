import { describe, expect, it } from 'vitest';

import { MISSING, formatDayLine, formatInt, formatPercent, formatTime, isoWeek, todayIso } from './format';

describe('formatInt', () => {
  it('uses the German thousands separator', () => {
    expect(formatInt(15000)).toBe('15.000');
    expect(formatInt(120000)).toBe('120.000');
  });

  it('rounds to an integer', () => {
    expect(formatInt(20207.6)).toBe('20.208');
    expect(formatInt(0.4)).toBe('0');
  });

  it('shows a dash for missing values', () => {
    expect(formatInt(null)).toBe(MISSING);
    expect(formatInt(undefined)).toBe(MISSING);
    expect(formatInt(Number.NaN)).toBe(MISSING);
  });
});

describe('formatTime', () => {
  it('formats in Europe/Berlin', () => {
    expect(formatTime('2026-05-21T05:41:01Z')).toBe('07:41');
  });

  it('shows a dash for missing or invalid timestamps', () => {
    expect(formatTime(null)).toBe(MISSING);
    expect(formatTime('kein Datum')).toBe(MISSING);
  });
});

describe('formatDayLine', () => {
  it('renders weekday and date in upper case', () => {
    expect(formatDayLine('2026-05-18')).toBe('MO 18.05.2026');
    expect(formatDayLine('2026-10-17')).toBe('SA 17.10.2026');
  });

  it('shows a dash for missing dates', () => {
    expect(formatDayLine(null)).toBe(MISSING);
  });
});

describe('isoWeek', () => {
  it.each([
    ['2026-05-18', 21],
    ['2026-10-12', 42],
    ['2026-01-01', 1],
    ['2027-01-01', 53],
    ['2027-09-27', 39],
  ])('%s is week %i', (date, week) => {
    const [year, month, day] = date.split('-').map(Number);
    expect(isoWeek(new Date(year, month - 1, day))).toBe(week);
  });
});

describe('todayIso', () => {
  it('returns the Berlin calendar day', () => {
    expect(todayIso(new Date('2026-05-17T22:30:00Z'))).toBe('2026-05-18');
  });
});

describe('formatPercent', () => {
  it('uses one decimal and a German comma', () => {
    expect(formatPercent(0.4216)).toBe('42,2 %');
    expect(formatPercent(-0.05)).toBe('-5,0 %');
    expect(formatPercent(null)).toBe('–');
  });
});
