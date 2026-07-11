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
    description: 'Sachlich und kurz mit Fachbegriffen',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Anweisung umschreiben
          </h3>
          <button
            onClick={onClose}
            disabled={isImproving}
            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Wähle einen Ton, in dem die Anweisung umgeschrieben werden soll:
        </p>

        <div className="space-y-2 mb-6">
          {TONE_OPTIONS.map((tone) => (
            <button
              key={tone.id}
              onClick={() => handleToneSelect(tone.id)}
              disabled={isImproving}
              className="w-full text-left p-3 rounded border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{tone.label}</p>
                  <p className="text-sm text-gray-600">{tone.description}</p>
                </div>
                {isImproving && (
                  <Loader size={16} className="animate-spin text-purple-600" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="bg-gray-100 rounded p-3 mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Original:</p>
          <p className="text-sm text-gray-800 line-clamp-2">{instruction}</p>
        </div>

        <button
          onClick={onClose}
          disabled={isImproving}
          className="w-full px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
