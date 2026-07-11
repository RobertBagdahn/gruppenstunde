import { useState, useEffect, useCallback, useRef } from 'react';
import { useRecipeBySlug } from '@/api/recipes';
import { RECIPE_DIFFICULTY_OPTIONS, RECIPE_EXECUTION_TIME_OPTIONS } from '@/schemas/recipe';
import MarkdownEditor from '@/components/MarkdownEditor';
import TagMultiSelect from './TagMultiSelect';
import type { MetadataSnapshot } from './RecipeWizard';

interface WizardStepMetadataProps {
  recipeId: number;
  recipeSlug: string;
  onDataChange?: (data: MetadataSnapshot) => void;
  initialData?: MetadataSnapshot;
}

const PREP_TIME_OPTIONS = [
  { value: 'less_15', label: 'Unter 15 Min.' },
  { value: 'less_30', label: 'Unter 30 Min.' },
  { value: 'less_60', label: 'Unter 60 Min.' },
  { value: 'more_60', label: 'Über 60 Min.' },
];

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Privat' },
  { value: 'public', label: 'Öffentlich' },
  { value: 'shared', label: 'Geteilt' },
  { value: 'group', label: 'Gruppe' },
];

export default function WizardStepMetadata({ recipeId, recipeSlug, onDataChange, initialData }: WizardStepMetadataProps) {
  const { data: recipe } = useRecipeBySlug(recipeSlug);
  void recipeId;

  const [summary, setSummary] = useState(initialData?.description || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || '');
  const [executionTime, setExecutionTime] = useState(initialData?.executionTime || '');
  const [preparationTime, setPreparationTime] = useState(initialData?.preparationTime || '');
  const [visibility, setVisibility] = useState(initialData?.visibility || 'private');
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>(initialData?.selectedTagSlugs || []);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (recipe && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setSummary(initialData?.description || recipe.summary || '');
      setDescription(initialData?.description || recipe.description || '');
      setDifficulty(initialData?.difficulty || recipe.difficulty || '');
      setExecutionTime(initialData?.executionTime || recipe.execution_time || '');
      setPreparationTime(initialData?.preparationTime || recipe.preparation_time || '');
      setVisibility(initialData?.visibility || recipe.visibility || 'private');
      setSelectedTagSlugs(
        initialData?.selectedTagSlugs?.length
          ? initialData.selectedTagSlugs
          : recipe.tags?.map((t: { slug: string }) => t.slug) || [],
      );
    }
  }, [recipe, initialData]);

  const notify = useCallback(() => {
    onDataChange?.({
      description,
      difficulty,
      executionTime,
      preparationTime,
      visibility,
      selectedTagSlugs,
    });
  }, [description, difficulty, executionTime, preparationTime, visibility, selectedTagSlugs, onDataChange]);

  const handleToggleTag = useCallback((slug: string) => {
    setSelectedTagSlugs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Metadaten</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Ergänze Details zu deinem Rezept.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Kurzbeschreibung</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => { setSummary(e.target.value); notify(); }}
          placeholder="Kurze Zusammenfassung..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
        <MarkdownEditor
          value={description}
          onChange={(val) => { setDescription(val); notify(); }}
          height={200}
          placeholder="Ausführliche Beschreibung in Markdown..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Schwierigkeit</label>
          <select
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); notify(); }}
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
            onChange={(e) => { setExecutionTime(e.target.value); notify(); }}
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
            onChange={(e) => { setPreparationTime(e.target.value); notify(); }}
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
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Sichtbarkeit</label>
        <select
          value={visibility}
          onChange={(e) => { setVisibility(e.target.value); notify(); }}
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
