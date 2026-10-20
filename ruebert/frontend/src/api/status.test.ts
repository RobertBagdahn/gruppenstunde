import { describe, expect, it } from 'vitest';

import { statusSchema } from '@/schemas/status';
import { STATUS_FIXTURE } from '@/test/fixtures';

import { UNREACHABLE_STAGE, shellStatusFrom } from './status';

const NOW = new Date('2026-10-17T10:00:00Z');

describe('statusSchema', () => {
  it('accepts the backend response', () => {
    expect(statusSchema.parse(STATUS_FIXTURE)).toEqual(STATUS_FIXTURE);
  });

  it('defaults missing badges and user', () => {
    const { badges: _badges, user: _user, ...rest } = STATUS_FIXTURE;
    const parsed = statusSchema.parse(rest);
    expect(parsed.badges).toEqual({});
    expect(parsed.user).toBeNull();
  });

  it('rejects an unknown stage status', () => {
    const broken = { ...STATUS_FIXTURE, stages: [{ ...STATUS_FIXTURE.stages[0], status: 'unknown' }] };
    expect(statusSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects a reference date with time', () => {
    expect(statusSchema.safeParse({ ...STATUS_FIXTURE, reference_date: '2026-05-18T00:00:00Z' }).success).toBe(false);
  });
});

describe('shellStatusFrom', () => {
  it('formats stages, week, date and user from the response', () => {
    const shell = shellStatusFrom({ data: STATUS_FIXTURE, isError: false }, NOW);
    expect(shell.currentWeek).toBe(21);
    expect(shell.today).toBe('MO 18.05.2026');
    expect(shell.badges).toEqual({ openDecisions: 23, activeProducts: 174, openCases: 7 });
    expect(shell.user).toEqual({ name: 'Daniel', role: 'Einkauf' });
    expect(shell.stages).toEqual([
      { label: 'Altdaten', time: '12:59', status: 'ok' },
      { label: 'Import · 1 Hinweis', time: '07:38', status: 'warn' },
      { label: 'Forecast #25', time: '07:41', status: 'ok' },
      { label: 'Ampel', time: '07:42', status: 'ok' },
    ]);
  });

  it('shows a dash for a stage that never ran', () => {
    const data = { ...STATUS_FIXTURE, stages: [{ key: 'forecast', label: 'Forecast', finished_at: null, status: 'error' as const }] };
    expect(shellStatusFrom({ data, isError: false }, NOW).stages).toEqual([{ label: 'Forecast', time: '–', status: 'error' }]);
  });

  it('falls back to a guest when the response has no user', () => {
    expect(shellStatusFrom({ data: { ...STATUS_FIXTURE, user: null }, isError: false }, NOW).user.name).toBe('Gast');
  });

  it('shows an empty pipeline and unknown week while loading', () => {
    const shell = shellStatusFrom({ isError: false }, NOW);
    expect(shell.stages).toEqual([]);
    expect(shell.currentWeek).toBeNull();
  });

  it('shows a red stage and the real week when the status is unreachable', () => {
    const shell = shellStatusFrom({ isError: true }, NOW);
    expect(shell.stages).toEqual([UNREACHABLE_STAGE]);
    expect(shell.currentWeek).toBe(42);
    expect(shell.today).toBe('SA 17.10.2026');
  });
});
