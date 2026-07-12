import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecipeBySlug, useUpdateRecipe, type RecipeUpdatePayload } from '@/api/recipes';
import { useAdminEquipment } from '@/api/admin';
import { useTags, useScoutLevels } from '@/api/tags';
import { useCurrentUser } from '@/api/auth';
import MarkdownEditor from '@/components/MarkdownEditor';
import { ArrowLeft, Save } from 'lucide-react';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_PREPARATION_TIME_OPTIONS,
} from '@/schemas/recipe';
import { toast } from 'sonner';

export default function EditRecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: recipe, isLoading, error } = useRecipeBySlug(slug ?? '');
  const updateRecipe = useUpdateRecipe(recipe?.id ?? 0);

  const [title, setTitle] = useState('');
  const [recipeType, setRecipeType] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  // Portions always normalized to 1 in backend (not user-editable)
  const [difficulty, setDifficulty] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedScoutIds, setSelectedScoutIds] = useState<number[]>([]);
  const [preparationMethod, setPreparationMethod] = useState('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);
  // Staff-only fields
  const [status, setStatus] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>([]);

  const { data: allTags } = useTags();
  const { data: scoutLevels } = useScoutLevels();
  const { data: equipment } = useAdminEquipment();

  // Pre-populate form when recipe loads
  useEffect(() => {
    if (recipe && !initialized) {
      setTitle(recipe.title);
      setRecipeType(recipe.recipe_type);
      setSummary(recipe.summary);
      setDescription(recipe.description);
      // Portions always 1 in backend
      setDifficulty(recipe.difficulty);
      setExecutionTime(recipe.execution_time);
      setPreparationTime(recipe.preparation_time);
      setSelectedTagIds(recipe.tags.map((t) => t.id));
      setSelectedScoutIds(recipe.scout_levels.map((s) => s.id));
      setPreparationMethod(recipe.preparation_method || '');
      setSelectedEquipmentIds(recipe.equipment?.map((e) => e.id) || []);
      // Staff fields
      setStatus(recipe.status || '');
      setSourceUrl(recipe.source_url || '');
      setSelectedAuthorIds(recipe.authors?.map((a) => a.id).filter((id): id is number => id !== null) || []);
      setInitialized(true);
    }
  }, [recipe, initialized]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleScoutLevel(id: number) {
    setSelectedScoutIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Bitte gib einen Titel ein');
      return;
    }

    const payload: RecipeUpdatePayload = {
      title: title.trim(),
      recipe_type: recipeType,
      preparation_method: preparationMethod || undefined,
      equipment_ids: selectedEquipmentIds.length > 0 ? selectedEquipmentIds : undefined,
      summary: summary.trim(),
      description: description.trim(),
      difficulty: difficulty || undefined,
      execution_time: executionTime || undefined,
      preparation_time: preparationTime || undefined,
      tag_ids: selectedTagIds,
      scout_level_ids: selectedScoutIds,
    };

    // Include staff-only fields if user is staff
    if (user?.is_staff) {
      if (status) payload.status = status;
      if (sourceUrl) payload.source_url = sourceUrl;
      if (selectedAuthorIds.length > 0) payload.authors_ids = selectedAuthorIds;
    }

    updateRecipe.mutate(payload, {
      onSuccess: (data) => {
        toast.success('Rezept gespeichert');
        navigate(`/recipes/${data.slug}`);
      },
      onError: (err) => {
        toast.error('Fehler beim Speichern', { description: err.message });
      },
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-destructive">Rezept nicht gefunden.</p>
      </div>
    );
  }

  if (!recipe.can_edit) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-destructive">Du hast keine Berechtigung, dieses Rezept zu bearbeiten.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <span className="material-symbols-outlined text-[24px]">edit</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Rezept bearbeiten</h1>
          <p className="text-sm text-muted-foreground">
            Änderungen an deinem Rezept vornehmen
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipe Type */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
            <span className="material-symbols-outlined text-primary text-[18px]">restaurant</span>
            Rezeptart
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RECIPE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecipeType(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  recipeType === opt.value
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                    : 'border-border hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[24px] ${
                    recipeType === opt.value ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {opt.icon}
                </span>
                <span
                  className={`font-medium text-xs ${
                    recipeType === opt.value ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Preparation Method */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
            <span className="material-symbols-outlined text-primary text-[18px]">cooking</span>
            Zubereitungsart
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: 'Keine Angabe' },
              { value: 'cooking', label: 'Kochen' },
              { value: 'baking', label: 'Backen' },
              { value: 'frying', label: 'Braten' },
              { value: 'grilling', label: 'Grillen' },
              { value: 'raw', label: 'Rohkost' },
              { value: 'none', label: 'Keine Zubereitung' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreparationMethod(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  preparationMethod === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        {equipment && equipment.length > 0 && (
          <div className="bg-card rounded-xl border p-5">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
              <span className="material-symbols-outlined text-primary text-[18px]">skillet</span>
              Equipment
            </label>
            <div className="flex flex-wrap gap-2">
              {equipment.map((eq) => {
                const isSelected = selectedEquipmentIds.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => {
                      setSelectedEquipmentIds((prev) =>
                        prev.includes(eq.id)
                          ? prev.filter((id) => id !== eq.id)
                          : [...prev, eq.id],
                      );
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {eq.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Title */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">title</span>
            Titel *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Lagerfeuer-Stockbrot, Pfadfinder-Eintopf..."
            required
            className="w-full px-4 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Summary */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">short_text</span>
            Zusammenfassung
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            placeholder="Kurze Beschreibung des Rezepts..."
            className="w-full px-4 py-2.5 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Description */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">description</span>
            Zubereitung
          </label>
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="Beschreibe die Zubereitung Schritt für Schritt..."
          />
        </div>

        {/* Servings + Meta */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
            <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
            Details
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Schwierigkeit</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">–</option>
                {RECIPE_DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kochzeit</label>
              <select
                value={executionTime}
                onChange={(e) => setExecutionTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">–</option>
                {RECIPE_EXECUTION_TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vorbereitung</label>
              <select
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">–</option>
                {RECIPE_PREPARATION_TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
            <span className="material-symbols-outlined text-primary text-[18px]">label</span>
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {allTags?.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {tag.icon && (
                  <span className="material-symbols-outlined text-[14px] mr-1">{tag.icon}</span>
                )}
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scout Levels */}
        {scoutLevels && (
          <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
            <span className="material-symbols-outlined text-[hsl(var(--chart-3))] text-[18px]">groups</span>
            Stufen
          </label>
          <div className="flex flex-wrap gap-2">
            {scoutLevels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => toggleScoutLevel(level.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedScoutIds.includes(level.id)
                    ? 'bg-[hsl(var(--chart-3))] text-white border-[hsl(var(--chart-3))]'
                    : 'bg-background hover:bg-muted'
                }`}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Admin Controls (Staff Only) */}
        {user?.is_staff && (
          <div className="bg-card rounded-xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-3 text-amber-900">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">admin_panel_settings</span>
              Admin-Kontrollen
            </label>
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label htmlFor="recipe-admin-status" className="text-xs text-amber-800 mb-1 block font-medium">Rezept-Status</label>
                <select
                  id="recipe-admin-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Keine Änderung</option>
                  <option value="draft">Entwurf</option>
                  <option value="submitted">Eingereicht</option>
                  <option value="approved">Genehmigt</option>
                  <option value="rejected">Abgelehnt</option>
                  <option value="archived">Archiviert</option>
                </select>
              </div>

              {/* Source URL */}
              <div>
                <label htmlFor="recipe-admin-source-url" className="text-xs text-amber-800 mb-1 block font-medium">Quell-URL</label>
                <input
                  id="recipe-admin-source-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="z.B. https://example.com/recipe"
                  className="w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Authors (Simplified: comma-separated IDs or user selection) */}
              <div>
                <label htmlFor="recipe-admin-authors" className="text-xs text-amber-800 mb-1 block font-medium">Autoren / Mitwirkende</label>
                <input
                  id="recipe-admin-authors"
                  type="text"
                  placeholder="Autor-IDs durch Komma getrennt, z.B. 1,2,3"
                  value={selectedAuthorIds.join(',')}
                  onChange={(e) => {
                    const ids = e.target.value
                      .split(',')
                      .map((id) => parseInt(id.trim(), 10))
                      .filter((id) => !isNaN(id));
                    setSelectedAuthorIds(ids);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="text-xs text-amber-700 mt-1">
                  {selectedAuthorIds.length > 0
                    ? `${selectedAuthorIds.length} Autor(en) ausgewählt`
                    : 'Keine Autoren'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-between items-center pt-4">
          <button
            type="button"
            onClick={() => navigate(`/recipes/${slug}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!title.trim() || updateRecipe.isPending}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold hover:bg-primary/90 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
          >
            <Save className="w-6 h-6" />
            {updateRecipe.isPending ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
