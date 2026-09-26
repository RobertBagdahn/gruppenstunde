import { createContext, useContext } from 'react';

export type LeaveDirection = 'next' | 'back';

/**
 * Runs before the wizard leaves a step. Return `false` to stay (after showing
 * a validation hint); throw to let the wizard show a single error toast.
 */
export type LeaveHandler = (direction: LeaveDirection) => Promise<boolean> | boolean;

export interface WizardStepContextValue {
  /** Registers a leave handler for the surrounding step; returns the cleanup. */
  registerLeave: (handler: LeaveHandler) => () => void;
}

export const WizardStepContext = createContext<WizardStepContextValue | null>(null);

export function useWizardStep(): WizardStepContextValue {
  const context = useContext(WizardStepContext);
  if (!context) throw new Error('useWizardStep muss innerhalb des Rezept-Wizards verwendet werden.');
  return context;
}
