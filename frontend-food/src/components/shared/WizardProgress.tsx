interface WizardStepDefinition {
  id: string;
  label: string;
}

interface WizardProgressProps {
  steps: readonly WizardStepDefinition[];
  currentStep: string;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStep));
  const current = steps[currentIndex];

  return (
    <div aria-label="Wizard-Fortschritt" className="space-y-1.5">
      <div className="flex gap-1" aria-hidden="true">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index <= currentIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-center text-caption text-muted-foreground" aria-live="polite">
        Schritt {currentIndex + 1} / {steps.length}: {current?.label ?? ''}
      </p>
    </div>
  );
}
