import { describe, expect, it } from 'vitest';
import { PULSE_IDLE_AFTER_MS, pulseIntervalMs } from './shoppingLists';

describe('pulseIntervalMs', () => {
  it('polls every 5 seconds while people are active', () => {
    expect(pulseIntervalMs(0, false)).toBe(5000);
    expect(pulseIntervalMs(PULSE_IDLE_AFTER_MS - 1, false)).toBe(5000);
  });

  it('slows down to 15 seconds after two idle minutes', () => {
    expect(pulseIntervalMs(PULSE_IDLE_AFTER_MS, false)).toBe(15000);
  });

  it('only keeps a safety net every 20 seconds while the socket is connected', () => {
    expect(pulseIntervalMs(0, true)).toBe(20000);
    expect(pulseIntervalMs(PULSE_IDLE_AFTER_MS * 5, true)).toBe(20000);
  });

  it('doubles the wait with every consecutive failure up to one minute', () => {
    expect([1, 2, 3, 4, 5].map((failures) => pulseIntervalMs(0, false, failures))).toEqual([10000, 20000, 40000, 60000, 60000]);
  });

  it('also backs off from the slow idle interval', () => {
    expect(pulseIntervalMs(PULSE_IDLE_AFTER_MS, false, 1)).toBe(30000);
    expect(pulseIntervalMs(PULSE_IDLE_AFTER_MS, false, 3)).toBe(60000);
  });

  it('returns to the normal interval without failures', () => {
    expect(pulseIntervalMs(0, false, 0)).toBe(5000);
  });
});
