import { Sparkles, Loader2 } from 'lucide-react';
import { MEAL_TYPE_LABELS, type MealPlanWizardState, type AiSuggestOut } from '@/schemas/mealPlan';
import { AiVoteButtons } from '@/components/shared/AiVoteButtons';
import AiLockBadge from '@/components/auth/AiLockBadge';
import { useAiAccess } from '@/hooks/useAiAccess';
import WizardSectionHeading from './WizardSectionHeading';
import { WIZARD_LABEL_CLASS } from './wizardStyles';

interface StepAiPromptProps {
  state: MealPlanWizardState;
  isLoading: boolean;
  onPromptChange: (prompt: string, resetSuggestions?: boolean) => void;
  onGenerate: () => void;
}

export default function StepAiPrompt({
  state,
  isLoading,
  onPromptChange,
  onGenerate,
}: StepAiPromptProps) {
  // Login is enforced by the page's guard; this only shows the state up front.
  const ai = useAiAccess();
  return (
    <div className="space-y-5">
      <div>
        <WizardSectionHeading icon={<Sparkles className="h-5 w-5" />}>KI-Vorschlag</WizardSectionHeading>
        <label htmlFor="wiz-ai-prompt" className={WIZARD_LABEL_CLASS}>
          Beschreibe dein Lager oder Event
        </label>
        <textarea
          id="wiz-ai-prompt"
          value={state.ai_prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={6}
          placeholder={
            'z.B. "Sommerlager in Dänemark, 30 Pfadfinder, ' +
            'herzhafte deutsche Küche, viel Gemüse, ein Tag ist Grillabend, ' +
            'Frühstück soll reichhaltig sein"'
          }
          className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-emphasis focus:outline-none focus:ring-2 focus:ring-primary/30 md:text-body"
        />
        <p className="mt-1.5 text-caption text-muted-foreground">
          Je genauer du beschreibst, desto besser werden die Vorschläge.
          Erwähne Personenanzahl, Küchenstil, Besonderheiten und Ernährungswünsche.
        </p>
      </div>

      {!state.ai_suggestions && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={!state.ai_prompt.trim() || isLoading || ai.disabled}
          title={ai.hint || undefined}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-body font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isLoading ? 'Generiere Vorschläge...' : 'Vorschläge generieren'}
          {ai.locked && <AiLockBadge />}
        </button>
      )}
      {!state.ai_suggestions && ai.hint && <p className="text-caption text-muted-foreground">{ai.hint}</p>}

      {state.ai_suggestions && (
        <div className="space-y-3 rounded-xl bg-card p-4 shadow-card">
          <h4 className="flex items-center gap-2 font-display text-body font-bold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Generierte Vorschläge
            {(state.ai_suggestions as AiSuggestOut).ai_interaction_id && (
              <AiVoteButtons interactionId={(state.ai_suggestions as AiSuggestOut).ai_interaction_id!} />
            )}
          </h4>
          <div className="space-y-3">
            {(state.ai_suggestions as AiSuggestOut).days.map((day) => (
              <div key={day.date} className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
                  {new Date(day.date + 'T00:00:00').toLocaleDateString('de-DE', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </p>
                <div className="grid gap-2">
                  {day.meals.map((meal, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-2.5 shadow-card">
                      <span className="text-caption font-bold uppercase tracking-wide text-primary">
                        {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
                      </span>
                      <span className="text-body font-semibold text-foreground">
                        {meal.recipe_title}
                      </span>
                      {meal.items && meal.items.length > 1 && (
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          Enthält: {meal.items.map((it) => it.title).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-caption text-muted-foreground">
            Die Vorschläge werden beim Erstellen des Plans als Mahlzeiten übernommen.
          </p>
        </div>
      )}

      {state.ai_suggestions && (
        <button
          type="button"
          onClick={() => {
            onPromptChange('', true);
          }}
          className="inline-flex min-h-11 items-center rounded-lg bg-primary-soft px-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/70"
        >
          Anderen Prompt ausprobieren
        </button>
      )}
    </div>
  );
}
