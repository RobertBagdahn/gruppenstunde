/**
 * Wizard state hook for Meal Plan Creation Wizard.
 * Manages step navigation, form state, and localStorage persistence.
 */
import { useState, useCallback, useEffect } from 'react';
import { getNextWeekend } from '@/lib/dateUtils';
import { defaultWizardState } from '@/schemas/mealPlan';
import type { MealPlanWizardState, MealPlanWizardStrategy } from '@/schemas/mealPlan';

const STORAGE_KEY = 'meal-plan-wizard';
const CURRENT_VERSION = 1;

export type WizardStep = 'basics' | 'strategy' | 'ai-prompt' | 'cockpit';

export const WIZARD_STEPS: WizardStep[] = ['basics', 'strategy', 'ai-prompt', 'cockpit'];

export const STEP_LABELS: Record<WizardStep, string> = {
  basics: 'Grundeinstellungen',
  strategy: 'Befüllung',
  'ai-prompt': 'KI-Beschreibung',
  cockpit: 'Zusammenfassung',
};

function loadPersistedState(): MealPlanWizardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as MealPlanWizardState;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistState(state: MealPlanWizardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage might be full or unavailable, ignore
  }
}

function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function buildInitialState(): MealPlanWizardState {
  const persisted = loadPersistedState();
  if (persisted) return persisted;

  const weekend = getNextWeekend();
  return {
    ...defaultWizardState,
    start_datetime: weekend.friday,
    end_datetime: weekend.sunday,
  } as MealPlanWizardState;
}

export function useMealPlanWizardState() {
  const [state, setState] = useState<MealPlanWizardState>(buildInitialState);
  const [step, setStep] = useState<WizardStep>('basics');
  const [extendedVisible, setExtendedVisible] = useState(false);

  const currentStepIndex = WIZARD_STEPS.indexOf(step);
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1;
  const canGoPrev = currentStepIndex > 0;

  const goNext = useCallback(() => {
    if (canGoNext) {
      const next = WIZARD_STEPS[currentStepIndex + 1];
      if (next === 'ai-prompt' && state.strategy !== 'ai') {
        setStep('cockpit');
      } else {
        setStep(next);
      }
    }
  }, [canGoNext, currentStepIndex, state.strategy]);

  const goPrev = useCallback(() => {
    if (canGoPrev) setStep(WIZARD_STEPS[currentStepIndex - 1]);
  }, [canGoPrev, currentStepIndex]);

  const updateState = useCallback((patch: Partial<MealPlanWizardState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const setStrategy = useCallback((strategy: MealPlanWizardStrategy) => {
    setState((s) => ({ ...s, strategy }));
  }, []);

  const setAiSuggestions = useCallback((suggestions: unknown) => {
    setState((s) => ({ ...s, ai_suggestions: suggestions }));
  }, []);

  const reset = useCallback(() => {
    clearPersistedState();
    const weekend = getNextWeekend();
    setState({
      ...defaultWizardState,
      start_datetime: weekend.friday,
      end_datetime: weekend.sunday,
    } as MealPlanWizardState);
    setStep('basics');
    setExtendedVisible(false);
  }, []);

  const cleanup = useCallback(() => {
    clearPersistedState();
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  return {
    state,
    step,
    setStep,
    currentStepIndex,
    canGoNext,
    canGoPrev,
    goNext,
    goPrev,
    updateState,
    setStrategy,
    setAiSuggestions,
    extendedVisible,
    setExtendedVisible,
    reset,
    cleanup,
  };
}
