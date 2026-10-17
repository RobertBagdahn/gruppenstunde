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
});
