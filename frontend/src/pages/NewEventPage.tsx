/**
 * NewEventPage — 8-step event creation wizard.
 * Uses react-hook-form + Zod for per-step validation,
 * Zustand store for cross-step state, TanStack Query for API calls.
 */
import { useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useCreateEvent, useEventTemplates } from '@/api/events';
import { useEventWizardStore, TOTAL_STEPS } from '@/store/eventWizardStore';
import WizardStepper from '@/components/events/wizard/WizardStepper';
import StepContextHelp from '@/components/events/wizard/StepContextHelp';
import { toast } from 'sonner';

// Lazy-load step components
const StepBasicData = lazy(() => import('@/components/events/wizard/StepBasicData'));
const StepGroupInvitation = lazy(() => import('@/components/events/wizard/StepGroupInvitation'));
const StepDateLocation = lazy(() => import('@/components/events/wizard/StepDateLocation'));
const StepRegistration = lazy(() => import('@/components/events/wizard/StepRegistration'));
const StepBookingOptions = lazy(() => import('@/components/events/wizard/StepBookingOptions'));
const StepPackingFields = lazy(() => import('@/components/events/wizard/StepPackingFields'));
const StepInvitationText = lazy(() => import('@/components/events/wizard/StepInvitationText'));
const StepSummary = lazy(() => import('@/components/events/wizard/StepSummary'));

const STEP_COMPONENTS = [
  StepBasicData,
  StepGroupInvitation,
  StepDateLocation,
  StepRegistration,
  StepBookingOptions,
  StepPackingFields,
  StepInvitationText,
  StepSummary,
];

export default function NewEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: user } = useCurrentUser();
  const createEvent = useCreateEvent();
  const { data: templates } = useEventTemplates();

  const {
    currentStep,
    stepValidity,
    nextStep,
    prevStep,
    getCreatePayload,
    reset,
    loadFromTemplate,
  } = useEventWizardStore();

  // Load template if ?template=<id> is in URL
  const templateIdParam = searchParams.get('template');
  useEffect(() => {
    if (templateIdParam && templates?.items) {
      const tid = Number(templateIdParam);
      const tmpl = templates.items.find((t) => t.id === tid);
      if (tmpl) {
        loadFromTemplate(
          {
            color: tmpl.color,
            icon: tmpl.icon,
            description: tmpl.description,
            booking_options: tmpl.booking_options?.map((o) => ({
              name: o.name,
              description: o.description || '',
              price: o.price || '0.00',
              max_participants: o.max_participants || 0,
              bookable_from: null,
              bookable_till: null,
            })),
          },
          tid,
        );
      }
    }
  }, [templateIdParam, templates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset store on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <div className="container py-16 text-center">
        <span className="material-symbols-outlined text-[48px] text-muted-foreground mb-3 block">
          lock
        </span>
        <p className="text-muted-foreground">Bitte melde dich an, um ein Event zu erstellen.</p>
      </div>
    );
  }

  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const canGoNext = stepValidity[currentStep];
  const StepComponent = STEP_COMPONENTS[currentStep];

  const handleCreate = () => {
    const payload = getCreatePayload();
    createEvent.mutate(payload as Parameters<typeof createEvent.mutate>[0], {
      onSuccess: (event) => {
        toast.success('Event erstellt!');
        reset();
        navigate(`/events/app/${event.slug}`);
      },
      onError: (err) => {
        toast.error('Fehler beim Erstellen', { description: err.message });
      },
    });
  };

  return (
    <div className="container py-8 max-w-3xl">
      {/* Stepper */}
      <WizardStepper />

      {/* Step content */}
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-40 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        }
      >
        <StepComponent />
      </Suspense>

      {/* Context help */}
      <div className="mt-6">
        <StepContextHelp step={currentStep} />
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="px-4 py-2 border rounded-md text-sm hover:bg-muted disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Zurück
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleCreate}
            disabled={createEvent.isPending || !useEventWizardStore.getState().data.name.trim()}
            className="px-6 py-2 gradient-primary text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">celebration</span>
            {createEvent.isPending ? 'Erstelle...' : 'Event erstellen'}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canGoNext}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-1"
          >
            Weiter
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        )}
      </div>

      {createEvent.isError && (
        <p className="text-sm text-destructive mt-4 text-center">
          {createEvent.error.message}
        </p>
      )}
    </div>
  );
}
