import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateRecipe } from '@/api/recipes';
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

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();

  // Bot protection
  const [honeyField, setHoneyField] = useState('');
  const loadedAt = useRef(Date.now());

  // Form state
  const [title, setTitle] = useState('');
  const [recipeType, setRecipeType] = useState('warm_meal');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState<number>(4);
  const [difficulty, setDifficulty] = useState('');
  const [costsRating, setCostsRating] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedScoutIds, setSelectedScoutIds] = useState<number[]>([]);

  const { data: allTags } = useTags();
  const { data: scoutLevels } = useScoutLevels();

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

    // Bot protection
    if (honeyField) return;
    const elapsedSeconds = (Date.now() - loadedAt.current) / 1000;
    if (elapsedSeconds < 5) return;

    if (!title.trim()) {
      toast.error('Bitte gib einen Titel ein');
      return;
    }

    createRecipe.mutate(
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
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        scout_level_ids: selectedScoutIds.length > 0 ? selectedScoutIds : undefined,
        website: honeyField,
        form_loaded_at: loadedAt.current,
      },
      {
        onSuccess: (data) => {
          toast.success('Rezept erstellt');
          navigate(`/recipes/${data.slug}`);
        },
        onError: (err) => {
          toast.error('Fehler beim Erstellen', { description: err.message });
        },
      },
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white">
          <span className="material-symbols-outlined text-[24px]">menu_book</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Neues Rezept erstellen</h1>
          <p className="text-sm text-muted-foreground">
            Teile dein Lieblingsrezept mit anderen Pfadfindern
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

        {/* Info box */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-500 text-[24px] mt-0.5">info</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Hinweis</p>
              <p className="text-blue-700">
                Zutaten, Bilder und weitere Details kannst du nach dem Erstellen hinzufuegen.
                Das Rezept wird als Entwurf gespeichert und erst veroeffentlicht, wenn du es freigibst.
              </p>
            </div>
          </div>
        </div>

        {/* Honeypot */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', top: '-9999px', height: 0, overflow: 'hidden' }}
        >
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            autoComplete="off"
            tabIndex={-1}
            value={honeyField}
            onChange={(e) => setHoneyField(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-between items-center pt-4">
          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!title.trim() || createRecipe.isPending}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">save</span>
            {createRecipe.isPending ? 'Wird gespeichert...' : 'Rezept erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}
