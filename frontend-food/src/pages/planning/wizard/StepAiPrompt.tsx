import { Sparkles, Loader2 } from 'lucide-react';
import type { MealPlanWizardState } from '@/schemas/mealPlan';

interface StepAiPromptProps {
  state: MealPlanWizardState;
  isLoading: boolean;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
}

export default function StepAiPrompt({
  state,
  isLoading,
  onPromptChange,
  onGenerate,
}: StepAiPromptProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Beschreibe dein Lager oder Event
        </label>
        <textarea
          value={state.ai_prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={6}
          placeholder={
            'z.B. "Sommerlager in Dänemark, 30 Pfadfinder, ' +
            'herzhafte deutsche Küche, viel Gemüse, ein Tag ist Grillabend, ' +
            'Frühstück soll reichhaltig sein"'
          }
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft resize-y"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Je genauer du beschreibst, desto besser werden die Vorschläge.
          Erwähne Personenanzahl, Küchenstil, Besonderheiten und Ernährungswünsche.
        </p>
      </div>

      {!state.ai_suggestions && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={!state.ai_prompt.trim() || isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isLoading ? 'Generiere Vorschläge...' : 'Vorschläge generieren'}
        </button>
      )}

      {state.ai_suggestions && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Generierte Vorschläge
          </h4>
          <div className="space-y-2">
            {(state.ai_suggestions as { days: { date: string; meals: { meal_type: string; recipe_title: string }[] }[] }).days.map((day: { date: string; meals: { meal_type: string; recipe_title: string }[] }) => (
              <div key={day.date} className="border border-border rounded-lg p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {new Date(day.date + 'T00:00:00').toLocaleDateString('de-DE', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </p>
                <div className="space-y-0.5">
                  {day.meals.map((meal, idx) => (
                    <p key={idx} className="text-sm font-semibold text-foreground">
                      {meal.recipe_title}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Die Vorschläge werden beim Erstellen des Plans als Mahlzeiten übernommen.
          </p>
        </div>
      )}

      {state.ai_suggestions && (
        <button
          type="button"
          onClick={() => onPromptChange(state.ai_prompt)}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Anderen Prompt ausprobieren
        </button>
      )}
    </div>
  );
}
