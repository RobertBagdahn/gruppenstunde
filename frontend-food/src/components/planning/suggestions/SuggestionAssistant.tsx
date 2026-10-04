import { useState } from 'react';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SuggestionFilters } from '@/schemas/mealPlan';
import {
  ASSISTANT_QUESTION_COUNT,
  buildAssistantQuestions,
  type ContextPatch,
  type QuestionOption,
} from './suggestionConfig';

interface SuggestionAssistantProps {
  mealType: string;
  /** Context fields the plan does not know yet; they replace filter questions and are asked once. */
  missingContext: string[];
  initialFilters: SuggestionFilters;
  onSaveContext: (patch: ContextPatch) => void;
  onFinish: (filters: SuggestionFilters, freeText: string) => void;
  onCancel: () => void;
}

/** Five-step assistant: four choice questions plus a free-text wish. */
export function SuggestionAssistant({
  mealType,
  missingContext,
  initialFilters,
  onSaveContext,
  onFinish,
  onCancel,
}: SuggestionAssistantProps) {
  // The question list is fixed on start so saving context does not reshuffle the steps.
  const [questions] = useState(() => buildAssistantQuestions(mealType, missingContext, new Set()));
  const totalSteps = ASSISTANT_QUESTION_COUNT + 1;
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState<SuggestionFilters>(initialFilters);
  const [freeText, setFreeText] = useState('');

  const isWishStep = step >= questions.length;
  const question = isWishStep ? null : questions[step];

  const choose = (option: QuestionOption | null) => {
    if (!question) return;
    if (option?.filters) setFilters((prev) => ({ ...prev, ...option.filters }));
    if (option?.context) onSaveContext(option.context);
    setStep((s) => s + 1);
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6" data-testid="suggestion-assistant">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)}>
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Abbrechen' : 'Zurück'}
        </Button>
        <span className="text-caption text-muted-foreground" aria-live="polite">
          {Math.min(step + 1, totalSteps)} von {totalSteps}
        </span>
      </div>

      {question ? (
        <>
          <h3 className="text-emphasis font-display font-semibold">{question.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {question.options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => choose(option)}
                className="rounded-xl border border-border bg-card px-4 py-3 text-left text-body font-medium hover:bg-muted/60 hover:border-primary/50 transition-colors"
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => choose(null)}
              className="rounded-xl border border-dashed border-border px-4 py-3 text-left text-body text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              Egal
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-emphasis font-display font-semibold">Hast du noch einen Wunsch?</h3>
          <Input
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="z. B. etwas mit Schokolade, ohne Kochen"
            maxLength={300}
            aria-label="Wunsch"
          />
          <p className="text-caption text-muted-foreground">
            Optional. Mit einem Wunsch sortiert der Zauberstab die Vorschläge neu und ergänzt passende Zutaten.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => onFinish(filters, freeText.trim())}>
              {freeText.trim().length >= 2 ? (
                <>
                  <Wand2 className="w-4 h-4" />
                  Vorschläge mit Wunsch zeigen
                </>
              ) : (
                'Vorschläge zeigen'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
