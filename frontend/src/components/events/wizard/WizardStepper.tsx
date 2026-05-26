/**
 * WizardStepper — progress indicator with step labels.
 * Shows all 8 steps with icons, completion state, and connecting lines.
 */
import { cn } from '@/lib/utils';
import { WIZARD_STEPS, useEventWizardStore } from '@/store/eventWizardStore';

export default function WizardStepper() {
  const { currentStep, stepValidity, setStep } = useEventWizardStore();

  return (
    <div className="flex items-start justify-between mb-8 overflow-x-auto pb-2">
      {WIZARD_STEPS.map((s, i) => {
        const isCompleted = stepValidity[i] && i < currentStep;
        const isCurrent = i === currentStep;
        const isClickable = i <= currentStep || stepValidity[i];

        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => isClickable && setStep(i)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm font-bold transition-all shrink-0',
                  isCompleted
                    ? 'gradient-primary text-white'
                    : isCurrent
                    ? 'gradient-primary text-white shadow-glow ring-2 ring-primary ring-offset-2'
                    : 'bg-muted text-muted-foreground',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-[20px] sm:text-[24px]">check</span>
                ) : isCurrent ? (
                  <span className="material-symbols-outlined text-[20px] sm:text-[24px]">{s.icon}</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px] sm:text-[24px] hidden sm:inline">{s.icon}</span>
                    <span className="sm:hidden text-sm font-bold">{i + 1}</span>
                  </>
                )}
              </button>
              <span
                className={cn(
                  'mt-1.5 text-xs font-medium text-center truncate w-full px-0.5 hidden sm:block',
                  isCurrent ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px sm:h-0.5 flex-1 mx-0.5 sm:mx-2 rounded-full transition-colors shrink-0 min-w-1 sm:min-w-2',
                  i < currentStep ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
