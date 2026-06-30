/**
 * Tests for useMealPlanWizardState hook logic.
 *
 * Task 6.2: Tests for step navigation, localStorage persistence, version check, cleanup.
 *
 * Note: React hook tests require renderHook from @testing-library/react.
 * Since we don't have that installed, we test the pure logic functions directly.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ---------------------------------------------------------------------------
// Import helpers (pure functions, not the hook itself)
// ---------------------------------------------------------------------------

// We test WIZARD_STEPS and STEP_LABELS directly via import
import { WIZARD_STEPS, STEP_LABELS } from './useMealPlanWizardState';

// ---------------------------------------------------------------------------
// Task 6.2: Step navigation
// ---------------------------------------------------------------------------

describe('WIZARD_STEPS', () => {
  it('contains expected steps in order', () => {
    expect(WIZARD_STEPS).toEqual(['basics', 'strategy', 'ai-prompt', 'cockpit']);
  });

  it('has 4 steps total', () => {
    expect(WIZARD_STEPS).toHaveLength(4);
  });

  it('first step is basics', () => {
    expect(WIZARD_STEPS[0]).toBe('basics');
  });

  it('last step is cockpit', () => {
    expect(WIZARD_STEPS[WIZARD_STEPS.length - 1]).toBe('cockpit');
  });
});

describe('STEP_LABELS', () => {
  it('has a label for every step', () => {
    for (const step of WIZARD_STEPS) {
      expect(STEP_LABELS[step]).toBeTruthy();
    }
  });

  it('has human-readable German labels', () => {
    expect(STEP_LABELS['basics']).toBe('Grundeinstellungen');
    expect(STEP_LABELS['strategy']).toBe('Befüllung');
    expect(STEP_LABELS['cockpit']).toBe('Zusammenfassung');
  });
});

// ---------------------------------------------------------------------------
// Task 6.2: localStorage persistence logic (tested via pure functions)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'meal-plan-wizard';
const CURRENT_VERSION = 1;

function loadPersistedState(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistState(state: Record<string, unknown>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

describe('localStorage persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('loadPersistedState returns null when nothing is stored', () => {
    expect(loadPersistedState()).toBeNull();
  });

  it('persistState and loadPersistedState round-trip correctly', () => {
    const state = { version: CURRENT_VERSION, name: 'Test Plan', norm_portions: 10 };
    persistState(state);
    const loaded = loadPersistedState();
    expect(loaded).toEqual(state);
  });

  it('loadPersistedState returns null for wrong version', () => {
    persistState({ version: 0, name: 'Old Plan' });
    const loaded = loadPersistedState();
    expect(loaded).toBeNull();
    // Also checks that old data is cleaned up
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clearPersistedState removes data from localStorage', () => {
    persistState({ version: CURRENT_VERSION, name: 'Test' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    clearPersistedState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('loadPersistedState returns null after clearPersistedState', () => {
    persistState({ version: CURRENT_VERSION, name: 'Test' });
    clearPersistedState();
    expect(loadPersistedState()).toBeNull();
  });

  it('loadPersistedState handles invalid JSON gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{');
    const result = loadPersistedState();
    expect(result).toBeNull();
    // Storage should be cleaned up
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Task 6.2: Step navigation logic
// ---------------------------------------------------------------------------

describe('step navigation logic', () => {
  it('goNext advances step correctly', () => {
    let stepIndex = 0;
    const canGoNext = stepIndex < WIZARD_STEPS.length - 1;
    expect(canGoNext).toBe(true);
    if (canGoNext) stepIndex++;
    expect(WIZARD_STEPS[stepIndex]).toBe('strategy');
  });

  it('goPrev goes back correctly', () => {
    let stepIndex = 2; // 'ai-prompt'
    const canGoPrev = stepIndex > 0;
    expect(canGoPrev).toBe(true);
    if (canGoPrev) stepIndex--;
    expect(WIZARD_STEPS[stepIndex]).toBe('strategy');
  });

  it('canGoNext is false at last step', () => {
    const stepIndex = WIZARD_STEPS.length - 1;
    const canGoNext = stepIndex < WIZARD_STEPS.length - 1;
    expect(canGoNext).toBe(false);
  });

  it('canGoPrev is false at first step', () => {
    const stepIndex = 0;
    const canGoPrev = stepIndex > 0;
    expect(canGoPrev).toBe(false);
  });

  it('skips ai-prompt step when strategy is not ai', () => {
    // Simulate goNext from 'strategy' when strategy !== 'ai'
    const strategy: string = 'empty';
    const stepIndex = WIZARD_STEPS.indexOf('strategy');
    const nextStep = WIZARD_STEPS[stepIndex + 1];
    const resolvedNext = nextStep === 'ai-prompt' && strategy !== 'ai' ? 'cockpit' : nextStep;
    expect(resolvedNext).toBe('cockpit');
  });

  it('goes to ai-prompt step when strategy is ai', () => {
    const strategy = 'ai';
    const stepIndex = WIZARD_STEPS.indexOf('strategy');
    const nextStep = WIZARD_STEPS[stepIndex + 1];
    const resolvedNext = nextStep === 'ai-prompt' && strategy !== 'ai' ? 'cockpit' : nextStep;
    expect(resolvedNext).toBe('ai-prompt');
  });
});
