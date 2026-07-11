import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, PenLine, Link, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useRecipeImportUrl } from '@/api/recipeImport';
import MarkdownRenderer from '@/components/MarkdownRenderer';

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

export default function WizardStepMethod({
  state,
  updateState,
  onCreated,
  onIngredientsCountChange,
  onTitleChange,
  onRecipeTypeChange,
}: WizardStepMethodProps) {
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const importMutation = useRecipeImportUrl();
  const [previewData, setPreviewData] = useState<Awaited<ReturnType<typeof importMutation.mutateAsync>> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/recipes/ai-create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Generierung fehlgeschlagen' }));
        throw new Error(err.detail || 'Generierung fehlgeschlagen');
      }
      const recipe = await res.json();
      onCreated(recipe.id, recipe.slug);
      onTitleChange(recipe.title || '');
      onRecipeTypeChange(recipe.recipe_type || null);
      onIngredientsCountChange(recipe.recipe_items?.length || 0);
      toast.success('Rezept generiert! Zutaten und Metadaten wurden vorausgefüllt.');
    } catch (err) {
      toast.error('KI-Generierung fehlgeschlagen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    try {
      const data = await importMutation.mutateAsync(importUrl.trim());
      setPreviewData(data);
    } catch (err) {
      toast.error('Import fehlgeschlagen', {
        description: err instanceof Error ? err.message : 'Konnte URL nicht importieren',
      });
    }
  };

  const handleConfirmUrlImport = async () => {
    if (!previewData) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/recipes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          title: previewData.recipe_draft.title,
          description: previewData.recipe_draft.description,
          summary: previewData.recipe_draft.summary,
          recipe_type: previewData.recipe_draft.recipe_type,
          difficulty: previewData.recipe_draft.difficulty,
          execution_time: previewData.recipe_draft.execution_time,
          preparation_time: previewData.recipe_draft.preparation_time,
          recipe_items: previewData.recipe_items.map((item) => ({
            portion_id: item.portion_id,
            quantity: item.quantity,
            note: item.note || '',
            sort_order: 0,
            is_optional: false,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Erstellung fehlgeschlagen' }));
        throw new Error(err.detail || 'Erstellung fehlgeschlagen');
      }
      const recipe = await res.json();
      onCreated(recipe.id, recipe.slug);
      onTitleChange(recipe.title || previewData.recipe_draft.title);
      onRecipeTypeChange(recipe.recipe_type || previewData.recipe_draft.recipe_type);
      onIngredientsCountChange(previewData.recipe_items.length);
      toast.success('Rezept aus URL erstellt!');
    } catch (err) {
      toast.error('Fehler beim Erstellen des Rezepts', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsCreating(false);
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
              </h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {previewData.recipe_items.map((item, i) => (
                  <li key={i}>
                    {item.quantity} {item.measuring_unit_name || 'g'} {item.ingredient_name}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBackToMethod}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            Verwerfen
          </button>
          <button
            type="button"
            onClick={handleConfirmUrlImport}
            disabled={isCreating}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Erstellt...
              </>
            ) : (
              <>
                Bestätigen
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBackToMethod}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={isAiGenerating || !aiPrompt.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {isAiGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rezept wird generiert...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generieren
                </>
              )}
            </button>
          </div>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUrlImport();
              }}
              placeholder="https://www.chefkoch.de/rezepte/..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBackToMethod}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={handleUrlImport}
              disabled={importMutation.isPending || !importUrl.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors disabled:opacity-50"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                'Importieren'
              )}
            </button>
          </div>
          {importMutation.isError && (
            <p className="text-sm text-red-600">{(importMutation.error as Error)?.message || 'Fehler beim Import'}</p>
          )}
        </div>
      )}
    </div>
  );
}

function getCsrfToken(): string {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='));
  return cookie ? cookie.split('=')[1] : '';
}
