import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecipeBySlug, useUpdateRecipe } from '@/api/recipes';
import { useTags, useScoutLevels } from '@/api/tags';
import MarkdownEditor from '@/components/MarkdownEditor';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_COSTS_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_PREPARATION_TIME_OPTIONS,
} from '@/schemas/recipe';
import { toast } from 'sonner';

export default function EditRecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: recipe, isLoading, error } = useRecipeBySlug(slug ?? '');
  const updateRecipe = useUpdateRecipe(recipe?.id ?? 0);

  const [title, setTitle] = useState('');
  const [recipeType, setRecipeType] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState<number>(4);
  const [difficulty, setDifficulty] = useState('');
  const [costsRating, setCostsRating] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedScoutIds, setSelectedScoutIds] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: allTags } = useTags();
  const { data: scoutLevels } = useScoutLevels();

  // Pre-populate form when recipe loads
  useEffect(() => {
    if (recipe && !initialized) {
      setTitle(recipe.title);
      setRecipeType(recipe.recipe_type);
      setSummary(recipe.summary);
      setDescription(recipe.description);
      setServings(recipe.servings ?? 4);
      setDifficulty(recipe.difficulty);
      setCostsRating(recipe.costs_rating);
      setExecutionTime(recipe.execution_time);
      setPreparationTime(recipe.preparation_time);
      setSelectedTagIds(recipe.tags.map((t) => t.id));
      setSelectedScoutIds(recipe.scout_levels.map((s) => s.id));
      setInitialized(true);
    }
  }, [recipe, initialized]);

  function toggleTag(id: number) {
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

    updateRecipe.mutate(
      {
        title: title.trim(),
        recipe_type: recipeType,
        summary: summary.trim(),
        description: description.trim(),
        servings,
        difficulty: difficulty || undefined,
        costs_rating: costsRating || undefined,
        execution_time: executionTime || undefined,
        preparation_time: preparationTime || undefined,
        tag_ids: selectedTagIds,
        scout_level_ids: selectedScoutIds,
      },
      {
        onSuccess: (data) => {
          toast.success('Rezept gespeichert');
          navigate(`/recipes/${data.slug}`);
        },
        onError: (err) => {
          toast.error('Fehler beim Speichern', { description: err.message });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl">
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
      <div className="container py-8 max-w-3xl text-center">
        <p className="text-destructive">Rezept nicht gefunden.</p>
      </div>
    );
  }

  if (!recipe.can_edit) {
    return (
      <div className="container py-8 max-w-3xl text-center">
        <p className="text-destructive">Du hast keine Berechtigung, dieses Rezept zu bearbeiten.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white">
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
            <span className="material-symbols-outlined text-rose-500 text-[18px]">restaurant</span>
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
                    ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-500/10'
                    : 'border-border hover:border-rose-500/30 hover:bg-rose-50/50'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[24px] ${
                    recipeType === opt.value ? 'text-rose-600' : 'text-muted-foreground'
                  }`}
                >
                  {opt.icon}
                </span>
                <span
                  className={`font-medium text-xs ${
                    recipeType === opt.value ? 'text-rose-700' : 'text-foreground'
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

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
            className="w-full px-4 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            className="w-full px-4 py-2.5 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            placeholder="Beschreibe die Zubereitung Schritt fuer Schritt..."
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
              <label className="text-xs text-muted-foreground mb-1 block">Portionen</label>
              <input
                type="number"
                min={1}
                max={999}
                value={servings}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) setServings(v);
                }}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Schwierigkeit</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
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
              <label className="text-xs text-muted-foreground mb-1 block">Kosten</label>
              <select
                value={costsRating}
                onChange={(e) => setCostsRating(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">–</option>
                {RECIPE_COSTS_OPTIONS.map((o) => (
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
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                    ? 'bg-rose-500 text-white border-rose-500'
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
              <span className="material-symbols-outlined text-blue-500 text-[18px]">groups</span>
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
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {level.name}
                </button>
              ))}
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
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!title.trim() || updateRecipe.isPending}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">save</span>
            {updateRecipe.isPending ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
