import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCurrentUser } from '@/api/auth';
import {
  useMealPlans,
  useCreateMealPlan,
  useDuplicateMealPlan,
} from '@/api/mealPlans';
import { useAiMealPlanSuggest } from '@/api/mealPlans';
import type { MealPlanWizardStrategy } from '@/schemas/mealPlan';
import UnauthGate from '@/components/shared/UnauthGate';

import { useMealPlanWizardState, WIZARD_STEPS, STEP_LABELS } from './useMealPlanWizardState';
import StepBasicSettings from './StepBasicSettings';
import StepStrategy from './StepStrategy';
import StepAiPrompt from './StepAiPrompt';
import StepCockpit from './StepCockpit';

export default function MealPlanWizardPage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: plans } = useMealPlans({});

  const {
    state,
    step,
    currentStepIndex,
    goNext,
    goPrev,
    updateState,
    setStrategy,
    setAiSuggestions,
    extendedVisible,
    setExtendedVisible,
    reset,
    cleanup,
  } = useMealPlanWizardState();

  const createMutation = useCreateMealPlan();
  const duplicateMutation = useDuplicateMealPlan();
  const aiSuggestMutation = useAiMealPlanSuggest();

  const nutritionalTagNames = useMemo(() => {
    return state.nutritional_tag_ids.length > 0 ? [] : [];
  }, [state.nutritional_tag_ids]);

  const handleGenerate = async () => {
    const startDate = state.start_datetime ? state.start_datetime.slice(0, 10) : '';
    const start = new Date(state.start_datetime);
    const end = new Date(state.end_datetime);
    const numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    try {
      const result = await aiSuggestMutation.mutateAsync({
        prompt: state.ai_prompt,
        num_persons: state.norm_portions,
        num_days: numDays,
        start_date: startDate,
        nutritional_tag_ids: state.nutritional_tag_ids.length > 0 ? state.nutritional_tag_ids : undefined,
        budget_per_person_per_day: state.budget_per_person_per_day ?? undefined,
      });
      setAiSuggestions(result);
      toast.success('Vorschläge generiert');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler bei der Generierung';
      toast.error('KI-Generierung fehlgeschlagen', { description: message });
    }
  };

  const handleCreate = async () => {
    if (state.strategy === 'reference' && state.reference_plan_id) {
      try {
        const plan = await duplicateMutation.mutateAsync({
          id: state.reference_plan_id,
          name: state.name,
          start_datetime: state.start_datetime + ':00',
          end_datetime: state.end_datetime + ':00',
          norm_portions: state.norm_portions,
        });
        toast.success('Essensplan aus Vorlage erstellt');
        cleanup();
        navigate(`/meal-plans/${plan.id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Fehler beim Erstellen';
        toast.error('Fehler', { description: message });
      }
    } else {
      try {
        const plan = await createMutation.mutateAsync({
          name: state.name,
          description: state.description || undefined,
          norm_portions: state.norm_portions,
          reserve_factor: state.reserve_factor,
          start_datetime: state.start_datetime ? state.start_datetime + ':00' : null,
          end_datetime: state.end_datetime ? state.end_datetime + ':00' : null,
          day_part_factors: state.day_part_factors,
          nutritional_tag_ids: state.nutritional_tag_ids.length > 0 ? state.nutritional_tag_ids : undefined,
        });

        if (state.strategy === 'ai' && state.ai_suggestions) {
          const suggestions = state.ai_suggestions as { days: { date: string; meals: { meal_type: string; recipe_id: number; recipe_title: string }[] }[] };
          for (const day of suggestions.days) {
            const dayDate = new Date(day.date + 'T12:00:00');
            const dayStart = new Date(dayDate);
            dayStart.setHours(8, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(20, 0, 0, 0);
          }
        }

        toast.success('Essensplan erstellt');
        cleanup();
        navigate(`/meal-plans/${plan.id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Fehler beim Erstellen';
        toast.error('Fehler', { description: message });
      }
    }
  };

  const handleCancel = () => {
    cleanup();
    reset();
    navigate('/meal-plans');
  };

  if (userLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <UnauthGate
        title="Essensplan erstellen"
        description="Melde dich an, um einen neuen Essensplan zu erstellen."
      />
    );
  }

  const isStepValid = () => {
    if (step === 'basics') return state.name.trim().length > 0;
    if (step === 'strategy') {
      if (state.strategy === 'reference') return state.reference_plan_id !== null;
      return true;
    }
    if (step === 'ai-prompt') return state.ai_prompt.trim().length > 0;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-foreground">Neuen Essensplan erstellen</h1>
        <p className="text-sm text-muted-foreground mt-1">Schritt {currentStepIndex + 1} von {WIZARD_STEPS.length - (state.strategy !== 'ai' ? 1 : 0)}</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 mb-6">
        {WIZARD_STEPS.map((s, i) => {
          const isActive = s === step;
          const isPast = currentStepIndex > i;
          const isSkipped = s === 'ai-prompt' && state.strategy !== 'ai';
          if (isSkipped) return null;
          return (
            <div key={s} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  isActive ? 'bg-primary' : isPast ? 'bg-primary/40' : 'bg-muted'
                }`}
              />
              <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                isActive ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50'
              }`}>
                {STEP_LABELS[s]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current step content */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-soft mb-6">
        {step === 'basics' && (
          <StepBasicSettings
            state={state}
            extendedVisible={extendedVisible}
            onToggleExtended={() => setExtendedVisible(!extendedVisible)}
            onChange={updateState}
          />
        )}

        {step === 'strategy' && (
          <StepStrategy
            state={state}
            plans={plans || []}
            onStrategyChange={(strategy: MealPlanWizardStrategy) => {
              setStrategy(strategy);
              if (strategy !== 'reference') {
                updateState({ reference_plan_id: null, reference_plan_name: '' });
              }
            }}
            onReferencePlanChange={(id, name) => updateState({ reference_plan_id: id, reference_plan_name: name })}
          />
        )}

        {step === 'ai-prompt' && (
          <StepAiPrompt
            state={state}
            isLoading={aiSuggestMutation.isPending}
            onPromptChange={(prompt) => updateState({ ai_prompt: prompt })}
            onGenerate={handleGenerate}
          />
        )}

        {step === 'cockpit' && (
          <StepCockpit
            state={state}
            nutritionalTagNames={nutritionalTagNames}
            onCreate={handleCreate}
            isPending={createMutation.isPending || duplicateMutation.isPending}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={step === 'basics' ? handleCancel : goPrev}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'basics' ? 'Abbrechen' : 'Zurück'}
        </button>

        {step !== 'cockpit' && (
          <button
            type="button"
            onClick={goNext}
            disabled={!isStepValid()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
          >
            Weiter
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
