/**
 * Wizard state hook for Meal Plan Creation Wizard.
 * Manages step navigation, form state, and localStorage persistence.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { getNextWeekend } from '@/lib/dateUtils';
import { defaultWizardState, MealPlanWizardStateSchema } from '@/schemas/mealPlan';
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

function loadPersistedState(contextKey: string): MealPlanWizardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = MealPlanWizardStateSchema.safeParse(JSON.parse(raw));
    if (!result.success || result.data.version !== CURRENT_VERSION || result.data.context_key !== contextKey) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return result.data;
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

function buildInitialState(contextKey: string): MealPlanWizardState {
  const persisted = loadPersistedState(contextKey);
  if (persisted) return persisted;

  const weekend = getNextWeekend();
  return {
    ...defaultWizardState(),
    context_key: contextKey,
    start_datetime: weekend.friday,
    end_datetime: weekend.sunday,
  };
}

export function useMealPlanWizardState(contextKey = 'anonymous') {
  const [state, setState] = useState<MealPlanWizardState>(() => buildInitialState(contextKey));
  const [step, setStep] = useState<WizardStep>('basics');
  const [extendedVisible, setExtendedVisible] = useState(false);
  const skipNextPersist = useRef(false);

  useEffect(() => {
    setState(buildInitialState(contextKey));
    setStep('basics');
  }, [contextKey]);

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

  const setAiSuggestions = useCallback((suggestions: MealPlanWizardState['ai_suggestions']) => {
    setState((s) => ({ ...s, ai_suggestions: suggestions }));
  }, []);

  const reset = useCallback(() => {
    clearPersistedState();
    skipNextPersist.current = true;
    const weekend = getNextWeekend();
    setState({
      ...defaultWizardState(),
      context_key: contextKey,
      start_datetime: weekend.friday,
      end_datetime: weekend.sunday,
    });
    setStep('basics');
    setExtendedVisible(false);
  }, [contextKey]);

  const cleanup = useCallback(() => {
    clearPersistedState();
  }, []);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    persistState({ ...state, context_key: contextKey });
  }, [contextKey, state]);

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
