import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useRecipeIngredientReviewPreview } from '@/api/recipeImport';
import type { IngredientReviewPreview } from '@/schemas/ingredientReview';
import type { RecipeImportSource } from '@/schemas/ingredientReview';
import { AiVoteButtons } from '@/components/shared/AiVoteButtons';
import { useWizardStep } from './wizardContext';

interface WizardStepMethodProps {
  aiInteractionId: string | null;
  hasResult: boolean;
  onSmartResult: (result: IngredientReviewPreview) => void;
  onManualStart: () => void;
  initialInput?: string;
}

export default function WizardStepMethod({
  aiInteractionId,
  hasResult,
  onSmartResult,
  onManualStart,
  initialInput = '',
}: WizardStepMethodProps) {
  const [input, setInput] = useState(initialInput);
  const [sources, setSources] = useState<RecipeImportSource[]>([]);
  // An unchanged input keeps the previous analysis when coming back.
  const hasResultRef = useRef(hasResult);
  const { mutateAsync: analyzeSources } = useRecipeIngredientReviewPreview();
  const { registerLeave } = useWizardStep();

  useEffect(() => registerLeave(async (direction) => {
    if (direction === 'back' || hasResultRef.current) return true;
    const value = input.trim();
    if (!value && sources.length === 0) {
      toast.error('Bitte füge einen Link, Rezepttext oder eine Rezeptidee ein.', {
        description: 'Oder wähle „Ohne KI manuell beginnen“.',
      });
      return false;
    }
    const sourceType: RecipeImportSource['type'] = /^https?:\/\//i.test(value) ? 'url' : 'text';
    const nextSources = sources.length > 0 ? sources : [{ type: sourceType, value }];
    const result = await analyzeSources(nextSources);
    onSmartResult(result);
    hasResultRef.current = true;
    return true;
  }), [analyzeSources, input, onSmartResult, registerLeave, sources]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-section font-display font-bold">Rezept mit KI vorbereiten</h2>
        <p className="mt-2 text-body text-muted-foreground">
          Füge einen Link ein, kopiere einen Rezepttext oder beschreibe deine Idee. Die KI strukturiert alles für dich.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
        <label htmlFor="recipe-smart-input" className="block text-body font-medium">
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
          className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            className="rounded-lg border px-3 py-2 text-body hover:bg-muted"
          >
            Quelle hinzufügen
          </button>
          {sources.map((source, index) => (
            <button
              key={`${source.type}-${index}`}
              type="button"
              onClick={() => {
                setSources((current) => current.filter((_, sourceIndex) => sourceIndex !== index));
                hasResultRef.current = false;
              }}
              className="max-w-full truncate rounded-full bg-muted px-3 py-1.5 text-caption text-muted-foreground"
              title="Quelle entfernen"
            >
              {source.type === 'url' ? source.value : 'Eingefügter Text'} ×
            </button>
          ))}
        </div>
        <p className="text-caption leading-relaxed text-muted-foreground">
          Bei blockierten Webseiten versucht die KI, das Rezept über die Websuche zu rekonstruieren. Prüfe die Angaben danach trotzdem.
        </p>
        {aiInteractionId && (
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <span>War die KI-Analyse hilfreich?</span>
            <AiVoteButtons interactionId={aiInteractionId} />
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onManualStart}
          data-testid="recipe-manual-start"
          className="text-body text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Ohne KI manuell beginnen
        </button>
      </div>
    </div>
  );
}
