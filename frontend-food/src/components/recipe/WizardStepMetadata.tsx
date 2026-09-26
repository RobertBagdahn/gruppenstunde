import { useState, useEffect, useCallback } from 'react';
import { useRecipeBySlug } from '@/api/recipes';
import { RECIPE_DIFFICULTY_OPTIONS, RECIPE_EXECUTION_TIME_OPTIONS } from '@/schemas/recipe';
import MarkdownEditor from '@/components/MarkdownEditor';
import TagMultiSelect from './TagMultiSelect';
import { buildMetadataPatch, type MetadataSnapshot } from './recipeWizardPayload';
import { useWizardStep } from './wizardContext';

interface WizardStepMetadataProps {
  recipeSlug: string;
  saveRecipe: (body: Record<string, unknown>) => Promise<void>;
}

const PREP_TIME_OPTIONS = [
  { value: 'none', label: 'Keine Angabe' },
  { value: 'less_15', label: 'Unter 15 Min.' },
  { value: '15_30', label: '15–30 Min.' },
  { value: '30_60', label: '30–60 Min.' },
  { value: 'more_60', label: 'Über 60 Min.' },
];

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Privat' },
  { value: 'public', label: 'Öffentlich' },
  { value: 'group', label: 'Gruppe' },
];

export default function WizardStepMetadata({ recipeSlug, saveRecipe }: WizardStepMetadataProps) {
  const { data: recipe } = useRecipeBySlug(recipeSlug);
  const { registerLeave } = useWizardStep();

  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);
  // Stays false until the loaded recipe filled the form. Sending the
  // uninitialised defaults wiped AI-generated content.
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!recipe || isInitialized) return;
    setSummary(recipe.summary || '');
    setDescription(recipe.description || '');
    setDifficulty(recipe.difficulty || '');
    setExecutionTime(recipe.execution_time || '');
    setPreparationTime(recipe.preparation_time || '');
    setVisibility(recipe.visibility || 'private');
    setSelectedTagSlugs(recipe.tags?.map((t: { id: string }) => t.id) || []);
    setIsInitialized(true);
  }, [recipe, isInitialized]);

  useEffect(() => registerLeave(async () => {
    const snapshot: MetadataSnapshot | null = isInitialized
      ? { summary, description, difficulty, executionTime, preparationTime, visibility, selectedTagSlugs }
      : null;
    const body = buildMetadataPatch(snapshot);
    if (body) await saveRecipe(body);
    return true;
  }), [
    description, difficulty, executionTime, isInitialized, preparationTime, registerLeave,
    saveRecipe, selectedTagSlugs, summary, visibility,
  ]);

  const handleToggleTag = useCallback((slug: string) => {
    setSelectedTagSlugs((current) => (current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Beschreibung &amp; Details</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Prüfe Beschreibung, Zeiten, Schwierigkeit und ergänze anschließend die Zubereitungsschritte.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Kurzbeschreibung</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Kurze Zusammenfassung..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
        <MarkdownEditor
          value={description}
          onChange={setDescription}
          height={200}
          placeholder="Ausführliche Beschreibung in Markdown..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Schwierigkeit</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Keine Angabe</option>
            {RECIPE_DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Zubereitungszeit</label>
          <select
            value={executionTime}
            onChange={(e) => setExecutionTime(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Keine Angabe</option>
            {RECIPE_EXECUTION_TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Vorbereitungszeit</label>
          <select
            value={preparationTime}
            onChange={(e) => setPreparationTime(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Keine Angabe</option>
            {PREP_TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Tags</label>
        <TagMultiSelect
          selectedSlugs={selectedTagSlugs}
          onToggle={handleToggleTag}
          valueKey="id"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Sichtbarkeit</label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        Deine Änderungen werden beim Klick auf "Weiter" gespeichert. Die Zutaten bleiben dabei erhalten.
      </div>
    </div>
  );
}
