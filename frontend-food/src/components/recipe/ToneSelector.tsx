/**
 * ToneSelector Component
 *
 * Modal for selecting a tone to rewrite a recipe step instruction with AI.
 * Shows tone options, loading state, and success/error feedback.
 */

import { X, Loader } from 'lucide-react';
import { useImproveStepInstruction } from '@/hooks/useRecipeSteps';
import { toast } from 'sonner';

interface ToneSelectorProps {
  instruction: string;
  recipeSlug: string;
  stepId: number;
  onApply: (improvedInstruction: string) => void;
  onClose: () => void;
}

const TONE_OPTIONS = [
  {
    id: 'präzise',
    label: 'Präzise',
    description: 'Sachlich und knapp mit Fachbegriffen',
  },
  {
    id: 'ausführlich',
    label: 'Ausführlich',
    description: 'Detailliert mit vielen Erklärungen',
  },
  {
    id: 'kurz',
    label: 'Kurz',
    description: 'Sehr kompakt, nur das Notwendigste',
  },
  {
    id: 'lustig',
    label: 'Lustig',
    description: 'Humorvoll und unterhaltsam',
  },
  {
    id: 'wissenschaftlich',
    label: 'Wissenschaftlich',
    description: 'Mit Begründungen und Erklärungen',
  },
  {
    id: 'anfänger',
    label: 'Anfänger-freundlich',
    description: 'Einfach erklärt, viele Details',
  },
];

export default function ToneSelector({
  instruction,
  recipeSlug,
  stepId,
  onApply,
  onClose,
}: ToneSelectorProps) {
  const { mutate: improveStep, isPending: isImproving } = useImproveStepInstruction();

  const handleToneSelect = (tone: string) => {
    improveStep(
      {
        recipe_slug: recipeSlug,
        step_id: stepId,
        tone,
      },
      {
        onSuccess: (data) => {
          onApply(data.improved_instruction);
          toast.success('Anweisung wurde umgeschrieben');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : 'Fehler beim Umschreiben';
          toast.error(message);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-card text-card-foreground rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tone-selector-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="tone-selector-title" className="text-lg font-semibold text-foreground">
            Anweisung umschreiben
          </h3>
          <button
            onClick={onClose}
            disabled={isImproving}
            className="p-1 hover:bg-muted rounded disabled:opacity-50"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Wähle einen Ton, in dem die Anweisung umgeschrieben werden soll:
        </p>

        <div className="space-y-2 mb-6">
          {TONE_OPTIONS.map((tone) => (
            <button
              key={tone.id}
              onClick={() => handleToneSelect(tone.id)}
              disabled={isImproving}
              className="w-full text-left p-3 rounded border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{tone.label}</p>
                  <p className="text-sm text-muted-foreground">{tone.description}</p>
                </div>
                {isImproving && (
                  <Loader size={16} className="animate-spin text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="bg-muted rounded p-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Original:</p>
          <p className="text-sm text-foreground line-clamp-2">{instruction}</p>
        </div>

        <button
          onClick={onClose}
          disabled={isImproving}
          className="w-full px-4 py-2 text-foreground bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
