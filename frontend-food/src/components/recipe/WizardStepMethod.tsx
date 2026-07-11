import { useState, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import { Sparkles, PenLine, Link } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useRecipeImportUrl } from '@/api/recipeImport';
import { useRecipeAiCreate } from '@/api/recipes';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { toBasePerServing } from '@/lib/cookingQuantityScale';
import { useBatchUpdateSteps } from '@/hooks/useRecipeSteps';

function extractErrorMessage(errBody: unknown): string {
  if (typeof errBody === 'string') {
    return errBody;
  }
  if (typeof errBody === 'object' && errBody !== null) {
    if ('detail' in errBody && typeof (errBody as Record<string, unknown>).detail === 'string') {
      return (errBody as Record<string, unknown>).detail as string;
    }
    if (Array.isArray(errBody)) {
      const messages = errBody
        .map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const record = item as Record<string, unknown>;
            return record.msg || record.message || record.detail || record.error || JSON.stringify(item);
          }
          return String(item);
        })
        .filter((msg) => msg && msg !== 'undefined');
      if (messages.length > 0) {
        return messages.join(', ');
      }
    }
  }
  return 'Erstellung fehlgeschlagen';
}

type CreationMethod = 'manual' | 'ai' | 'url' | null;

interface WizardState {
  currentStep: number;
  recipeId: number | null;
  recipeSlug: string | null;
  creationMethod: CreationMethod;
}

interface WizardStepMethodProps {
  state: WizardState;
  updateState: (patch: Partial<WizardState>) => void;
  onCreated: (recipeId: number, recipeSlug: string) => void;
  onIngredientsCountChange: (count: number) => void;
  onTitleChange: (title: string) => void;
  onRecipeTypeChange: (type: string | null) => void;
}

export interface WizardStepMethodHandle {
  /**
   * Runs the action appropriate for the current sub-state (generate / import / confirm)
   * when the user clicks the central "Weiter" button.
   * Returns true if the wizard may advance to the next step, false if it should stay
   * on this step (e.g. because a preview still needs to be confirmed, or an error occurred).
   */
  primaryAction: () => Promise<boolean>;
}

const WizardStepMethod = forwardRef<WizardStepMethodHandle, WizardStepMethodProps>(function WizardStepMethod({
  state,
  updateState,
  onCreated,
  onIngredientsCountChange,
  onTitleChange,
  onRecipeTypeChange,
}, ref) {
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const importMutation = useRecipeImportUrl();
  const aiCreateMutation = useRecipeAiCreate();
  const batchUpdateSteps = useBatchUpdateSteps();
  const [previewData, setPreviewData] = useState<Awaited<ReturnType<typeof importMutation.mutateAsync>> | null>(null);

  const handleSelectManual = () => {
    updateState({ creationMethod: 'manual' });
  };

  const handleStartAi = () => {
    setShowAiInput(true);
    updateState({ creationMethod: 'ai' });
  };

  const handleStartUrl = () => {
    setShowUrlInput(true);
    updateState({ creationMethod: 'url' });
  };

  const handleAiGenerate = async (): Promise<boolean> => {
    if (!aiPrompt.trim()) return false;
    try {
      const recipe = await aiCreateMutation.mutateAsync({ prompt: aiPrompt.trim() });
      onCreated(recipe.id, recipe.slug);
      onTitleChange(recipe.title || '');
      onRecipeTypeChange(recipe.recipe_type || null);
      onIngredientsCountChange(recipe.recipe_items?.length || 0);
      toast.success('Rezept generiert! Zutaten und Metadaten wurden vorausgefüllt.');
      return true;
    } catch (err) {
      toast.error('KI-Generierung fehlgeschlagen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
      return false;
    }
  };

  const handleUrlImport = async (): Promise<boolean> => {
    if (!importUrl.trim()) return false;
    try {
      const data = await importMutation.mutateAsync(importUrl.trim());
      setPreviewData(data);
      return true;
    } catch (err) {
      toast.error('Import fehlgeschlagen', {
        description: err instanceof Error ? err.message : 'Konnte URL nicht importieren',
      });
      return false;
    }
  };

  const handleConfirmUrlImport = async (): Promise<boolean> => {
    if (!previewData) return false;
    try {
      // The import service returns quantities for the ORIGINAL recipe's serving
      // count (e.g. "4 Stück Hühnerbrustfilet" for a recipe that serves 4), but
      // the backend always stores recipe_items as per-1-portion amounts. Divide
      // every quantity by the detected servings count before sending.
      const servings = previewData.recipe_draft.servings || 1;
      const res = await fetch('/api/recipes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          title: previewData.recipe_draft.title,
          description: previewData.recipe_draft.description,
          summary: previewData.recipe_draft.summary,
          recipe_type: previewData.recipe_draft.recipe_type || 'warm_meal',
          difficulty: previewData.recipe_draft.difficulty || 'easy',
          execution_time: previewData.recipe_draft.execution_time_choice || 'less_30',
          preparation_time: previewData.recipe_draft.preparation_time_choice || 'none',
          recipe_items: previewData.recipe_items.map((item) => ({
            portion_id: item.portion_id,
            quantity: toBasePerServing(item.quantity, servings),
            note: item.note || '',
            sort_order: 0,
            is_optional: false,
          })),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ detail: 'Erstellung fehlgeschlagen' }));
        throw new Error(extractErrorMessage(errBody));
      }
      const recipe = await res.json();
      onCreated(recipe.id, recipe.slug);
      onTitleChange(recipe.title || previewData.recipe_draft.title);
      onRecipeTypeChange(recipe.recipe_type || previewData.recipe_draft.recipe_type);
      onIngredientsCountChange(previewData.recipe_items.length);

      // Carry over the extracted preparation steps as structured recipe steps.
      if (previewData.recipe_draft.steps.length > 0) {
        try {
          await batchUpdateSteps.mutateAsync({
            recipe_slug: recipe.slug,
            steps: previewData.recipe_draft.steps.map((instruction, index) => ({
              sort_order: index,
              instruction,
              duration_minutes: null,
              section: '',
              step_ingredients: [],
            })),
          });
        } catch (stepErr) {
          toast.error('Zubereitungsschritte konnten nicht übernommen werden', {
            description: stepErr instanceof Error ? stepErr.message : 'Unbekannter Fehler',
          });
        }
      }

      toast.success('Rezept aus URL erstellt!');
      return true;
    } catch (err) {
      toast.error('Fehler beim Erstellen des Rezepts', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
      return false;
    }
  };

  const handleBackToMethod = () => {
    setShowAiInput(false);
    setShowUrlInput(false);
    setPreviewData(null);
    setAiPrompt('');
    setImportUrl('');
    updateState({ creationMethod: null, recipeId: null, recipeSlug: null });
  };

  useImperativeHandle(ref, () => ({
    primaryAction: async () => {
      if (state.creationMethod === 'manual') {
        return true;
      }

      if (state.creationMethod === 'ai') {
        if (state.recipeId) return true;
        if (!aiPrompt.trim()) {
          toast.error('Bitte beschreibe dein Rezept');
          return false;
        }
        return handleAiGenerate();
      }

      if (state.creationMethod === 'url') {
        if (state.recipeId) return true;
        if (previewData) {
          return handleConfirmUrlImport();
        }
        if (!importUrl.trim()) {
          toast.error('Bitte gib eine URL ein');
          return false;
        }
        // Fetching the preview never advances the wizard step by itself;
        // the user needs to review it and click "Weiter" again to confirm.
        await handleUrlImport();
        return false;
      }

      return false;
    },
  }));

  if (previewData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Vorschau</h2>
          <button
            type="button"
            onClick={handleBackToMethod}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Andere Methode wählen
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{previewData.recipe_draft.title}</CardTitle>
            {previewData.recipe_draft.summary && (
              <CardDescription>{previewData.recipe_draft.summary}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {previewData.recipe_draft.description && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Beschreibung</h4>
                <MarkdownRenderer content={previewData.recipe_draft.description} />
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold mb-1">
                Zutaten ({previewData.recipe_items.length})
                <span className="ml-2 font-normal text-muted-foreground">
                  für {previewData.recipe_draft.servings || 1}{' '}
                  {(previewData.recipe_draft.servings || 1) === 1 ? 'Person' : 'Personen'}
                </span>
              </h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {previewData.recipe_items.map((item, i) => (
                  <li key={i}>
                    {item.quantity} {item.measuring_unit_name || 'g'} {item.ingredient_name}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Die Mengen werden beim Übernehmen automatisch auf 1 Portion umgerechnet.
              </p>
            </div>
            {previewData.recipe_draft.steps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">
                  Zubereitungsschritte ({previewData.recipe_draft.steps.length})
                </h4>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  {previewData.recipe_draft.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Klicke unten auf „Weiter“, um das Rezept zu übernehmen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Wie möchtest du dein Rezept erstellen?</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Wähle eine Methode, um loszulegen.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Manual */}
        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 ${state.creationMethod === 'manual' ? 'border-primary ring-2 ring-primary/20' : ''}`}
          onClick={handleSelectManual}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <PenLine className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Manuell</CardTitle>
            <CardDescription>
              Titel, Zutaten und Schritte selbst eingeben.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* KI */}
        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 ${state.creationMethod === 'ai' ? 'border-primary ring-2 ring-primary/20' : ''}`}
          onClick={handleStartAi}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Mit KI-Hilfe</CardTitle>
            <CardDescription>
              Beschreibe dein Rezept und lass es von der KI generieren.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* URL */}
        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 ${state.creationMethod === 'url' ? 'border-primary ring-2 ring-primary/20' : ''}`}
          onClick={handleStartUrl}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center mb-2">
              <Link className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Von URL importieren</CardTitle>
            <CardDescription>
              Rezept von Chefkoch oder anderen Webseiten importieren.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* AI Input */}
      {showAiInput && (
        <div className="space-y-4 p-4 bg-amber-50/50 border border-amber-200 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Beschreibe dein Rezept
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="z.B. Nudelauflauf mit Hackfleisch und Käse überbacken, dazu ein frischer Salat..."
              className="w-full min-h-[100px] px-3 py-2 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={4}
            />
          </div>
          <button
            type="button"
            onClick={handleBackToMethod}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            Zurück
          </button>
        </div>
      )}

      {/* URL Input */}
      {showUrlInput && (
        <div className="space-y-4 p-4 bg-violet-50/50 border border-violet-200 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1.5">Rezept-URL</label>
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://www.chefkoch.de/rezepte/..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="button"
            onClick={handleBackToMethod}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            Zurück
          </button>
          {importMutation.isError && (
            <p className="text-sm text-red-600">{(importMutation.error as Error)?.message || 'Fehler beim Import'}</p>
          )}
        </div>
      )}
    </div>
  );
});

export default WizardStepMethod;

function getCsrfToken(): string {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='));
  return cookie ? cookie.split('=')[1] : '';
}
