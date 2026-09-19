import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useRecipeIngredientReviewPreview } from '@/api/recipeImport';
import type { IngredientReviewPreview } from '@/schemas/ingredientReview';
import type { RecipeImportSource } from '@/schemas/ingredientReview';
import { AiVoteButtons } from '@/components/shared/AiVoteButtons';

export type CreationMethod = 'manual' | 'ai' | 'url' | 'smart' | null;

export interface WizardState {
  currentStep: number;
  recipeId: number | null;
  recipeSlug: string | null;
  creationMethod: CreationMethod;
  aiInteractionId?: string | null;
}

interface WizardStepMethodProps {
  state: WizardState;
  updateState: (patch: Partial<WizardState>) => void;
  onSmartResult: (result: IngredientReviewPreview) => void;
  initialInput?: string;
}

export interface WizardStepMethodHandle {
  primaryAction: () => Promise<boolean>;
}

const WizardStepMethod = forwardRef<WizardStepMethodHandle, WizardStepMethodProps>(function WizardStepMethod({
  state,
  updateState,
  onSmartResult,
  initialInput = '',
}, ref) {
  const [input, setInput] = useState(initialInput);
  const [sources, setSources] = useState<RecipeImportSource[]>([]);
  const hasResultRef = useRef(false);
  const smartInput = useRecipeIngredientReviewPreview();

  const analyze = useCallback(async (): Promise<boolean> => {
    const value = input.trim();
    if (!value) {
      toast.error('Bitte füge einen Link, Rezepttext oder eine Rezeptidee ein.');
      return false;
    }
    try {
      const sourceType: RecipeImportSource['type'] = /^https?:\/\//i.test(value) ? 'url' : 'text';
      const nextSources = sources.length > 0 ? sources : [{ type: sourceType, value }];
      const result = await smartInput.mutateAsync(nextSources);
      updateState({ creationMethod: 'smart' });
      onSmartResult(result);
      hasResultRef.current = true;
      return true;
    } catch (error) {
      toast.error('Analyse fehlgeschlagen', {
        description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
      });
      return false;
    }
  }, [input, onSmartResult, sources, smartInput, updateState]);

  useImperativeHandle(ref, () => ({
    primaryAction: async () => {
      if (hasResultRef.current) return true;
      return analyze();
    },
  }), [analyze]);

  void state;
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-display font-bold">Rezept mit KI vorbereiten</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Füge einen Link ein, kopiere einen Rezepttext oder beschreibe deine Idee. Die KI strukturiert alles für dich.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
        <label htmlFor="recipe-smart-input" className="block text-sm font-medium">
          Link, Rezepttext oder Idee
        </label>
        <textarea
          id="recipe-smart-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            hasResultRef.current = false;
          }}
          placeholder="z. B. https://www.chefkoch.de/... oder „Kartoffelsuppe für 4 Personen“"
          rows={7}
          className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          data-testid="recipe-smart-input"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const value = input.trim();
              if (!value) return;
              const type = /^https?:\/\//i.test(value) ? 'url' : 'text';
              setSources((current) => [...current, { type, value }]);
              setInput('');
              hasResultRef.current = false;
            }}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            Quelle hinzufügen
          </button>
          {sources.map((source, index) => (
            <button
              key={`${source.type}-${index}`}
              type="button"
              onClick={() => setSources((current) => current.filter((_, sourceIndex) => sourceIndex !== index))}
              className="max-w-full truncate rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground"
              title="Quelle entfernen"
            >
              {source.type === 'url' ? source.value : 'Eingefügter Text'} ×
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Bei blockierten Webseiten versucht die KI, das Rezept über die Websuche zu rekonstruieren. Prüfe die Angaben danach trotzdem.
        </p>
        {state.aiInteractionId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>War die KI-Analyse hilfreich?</span>
            <AiVoteButtons interactionId={state.aiInteractionId} />
          </div>
        )}
      </div>
    </div>
  );
});

export default WizardStepMethod;
