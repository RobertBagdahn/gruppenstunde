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

export default function WizardStepMetadata({ recipeId, recipeSlug, onDataChange, initialData }: WizardStepMetadataProps) {
  const { data: recipe } = useRecipeBySlug(recipeSlug);
  void recipeId;

  const [summary, setSummary] = useState(initialData?.summary || '');
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
      const initial: MetadataSnapshot = {
        summary: initialData?.summary || recipe.summary || '',
        description: initialData?.description || recipe.description || '',
        difficulty: initialData?.difficulty || recipe.difficulty || '',
        executionTime: initialData?.executionTime || recipe.execution_time || '',
        preparationTime: initialData?.preparationTime || recipe.preparation_time || '',
        visibility: initialData?.visibility || recipe.visibility || 'private',
        selectedTagSlugs: initialData?.selectedTagSlugs?.length
          ? initialData.selectedTagSlugs
          : recipe.tags?.map((t: { id: string }) => t.id) || [],
      };
      setSummary(initial.summary);
      setDescription(initial.description);
      setDifficulty(initial.difficulty);
      setExecutionTime(initial.executionTime);
      setPreparationTime(initial.preparationTime);
      setVisibility(initial.visibility);
      setSelectedTagSlugs(initial.selectedTagSlugs);
      // Report the loaded values, otherwise the wizard would keep its
      // uninitialised defaults and wipe the recipe on "Weiter".
      onDataChange?.(initial);
    }
  }, [recipe, initialData, onDataChange]);

  const notify = useCallback((next: Partial<MetadataSnapshot> = {}) => {
    onDataChange?.({
      summary: next.summary ?? summary,
      description: next.description ?? description,
      difficulty: next.difficulty ?? difficulty,
      executionTime: next.executionTime ?? executionTime,
      preparationTime: next.preparationTime ?? preparationTime,
      visibility: next.visibility ?? visibility,
      selectedTagSlugs: next.selectedTagSlugs ?? selectedTagSlugs,
    });
  }, [summary, description, difficulty, executionTime, preparationTime, visibility, selectedTagSlugs, onDataChange]);

  const handleToggleTag = useCallback((slug: string) => {
    const next = selectedTagSlugs.includes(slug)
      ? selectedTagSlugs.filter((s) => s !== slug)
      : [...selectedTagSlugs, slug];
    setSelectedTagSlugs(next);
    notify({ selectedTagSlugs: next });
  }, [notify, selectedTagSlugs]);

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
          onChange={(e) => { const value = e.target.value; setSummary(value); notify({ summary: value }); }}
          placeholder="Kurze Zusammenfassung..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
        <MarkdownEditor
          value={description}
          onChange={(val) => { setDescription(val); notify({ description: val }); }}
          height={200}
          placeholder="Ausführliche Beschreibung in Markdown..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Schwierigkeit</label>
          <select
            value={difficulty}
            onChange={(e) => { const value = e.target.value; setDifficulty(value); notify({ difficulty: value }); }}
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
            onChange={(e) => { const value = e.target.value; setExecutionTime(value); notify({ executionTime: value }); }}
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
            onChange={(e) => { const value = e.target.value; setPreparationTime(value); notify({ preparationTime: value }); }}
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
          onChange={(e) => { const value = e.target.value; setVisibility(value); notify({ visibility: value }); }}
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
