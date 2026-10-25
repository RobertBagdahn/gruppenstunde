import DetailHeader from '@/components/shared/DetailHeader';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecipeBySlug, useUpdateRecipe, type RecipeUpdatePayload } from '@/api/recipes';
import { useTags, useScoutLevels } from '@/api/tags';
import { useCurrentUser } from '@/api/auth';
import MarkdownEditor from '@/components/MarkdownEditor';
import RecipeMaterialsEditor from '@/components/recipe/RecipeMaterialsEditor';
import RecipeMaterialSuggestionsDialog from '@/components/recipe/RecipeMaterialSuggestionsDialog';
import { ArrowLeft, Save } from 'lucide-react';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_PREPARATION_TIME_OPTIONS,
  type RecipeType,
} from '@/schemas/recipe';
import { notify } from '@/lib/notify';
import { Icon } from '@/components/ui/icon';
import { PageSkeleton } from '@/components/ui/skeleton';

/** Section heading in the Canvas card language: icon plaque on a soft petrol tile, uppercase label. */
function SectionHeading({ icon, children, tone = 'primary' }: { icon: ReactNode; children: ReactNode; tone?: 'primary' | 'warning' }) {
  return (
    <h2
      className={`mb-4 flex items-center gap-3 text-body font-semibold uppercase tracking-wide ${
        tone === 'warning' ? 'text-warning' : 'text-muted-foreground'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          tone === 'warning' ? 'bg-card text-warning' : 'bg-primary-soft text-primary'
        }`}
      >
        {icon}
      </span>
      {children}
    </h2>
  );
}

const INPUT_CLASS =
  'w-full min-h-11 px-4 py-2.5 rounded-lg border bg-background text-emphasis md:text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';
const SELECT_CLASS =
  'w-full min-h-11 px-3 py-2.5 rounded-lg border bg-background text-emphasis md:text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';
const CHIP_BASE = 'inline-flex min-h-11 items-center rounded-full px-4 text-caption font-medium border transition-colors';

export default function EditRecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: recipe, isLoading, error } = useRecipeBySlug(slug ?? '');
  const updateRecipe = useUpdateRecipe(recipe?.id ?? 0);

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [recipeType, setRecipeType] = useState<RecipeType | ''>('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  // Portions always normalized to 1 in backend (not user-editable)
  const [difficulty, setDifficulty] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedScoutIds, setSelectedScoutIds] = useState<number[]>([]);
  const [preparationMethod, setPreparationMethod] = useState('');
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  // Staff-only fields
  const [status, setStatus] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>([]);

  const { data: allTags } = useTags();
  const { data: scoutLevels } = useScoutLevels();

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
      setTitleError('Titel ist erforderlich.');
      titleInputRef.current?.focus();
      return;
    }

    const payload: RecipeUpdatePayload = {
      title: title.trim(),
      recipe_type: recipeType,
      preparation_method: preparationMethod || undefined,
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
        notify.success('Rezept gespeichert');
        navigate(`/recipes/${data.slug}`);
      },
      onError: (err) => {
        notify.error('Rezept konnte nicht gespeichert werden', { error: err });
      },
    });
  }

  if (isLoading) {
    return (
      <PageSkeleton label="Rezept wird geladen" />
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
    <div className="pb-8">
    <DetailHeader
      title="Rezept bearbeiten"
      description="Änderungen an deinem Rezept vornehmen"
    />
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

      <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
        {/* Recipe Type */}
        <section className="bg-card rounded-xl p-5 shadow-card">
          <SectionHeading icon={<Icon name="restaurant" size={20} />}>Rezeptart</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RECIPE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecipeType(opt.value)}
                aria-pressed={recipeType === opt.value}
                className={`flex min-h-11 flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors text-center ${
                  recipeType === opt.value
                    ? 'border-primary bg-primary-soft text-primary-dark font-semibold'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <Icon name={opt.icon} size={24} className={`${
                    recipeType === opt.value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                <span
                  className={`font-medium text-caption ${
                    recipeType === opt.value ? 'text-primary-dark' : 'text-foreground'
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Preparation Method */}
        <section className="bg-card rounded-xl p-5 shadow-card">
          <SectionHeading icon={<Icon name="cooking" size={20} />}>Zubereitungsart</SectionHeading>
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
                aria-pressed={preparationMethod === opt.value}
                onClick={() => setPreparationMethod(opt.value)}
                className={`${CHIP_BASE} ${
                  preparationMethod === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Materials */}
        <section className="bg-card rounded-xl p-5 shadow-card">
          <SectionHeading icon={<Icon name="inventory_2" size={20} />}>Material</SectionHeading>
          <RecipeMaterialsEditor
            recipeId={recipe.id}
            onSuggestClick={() => setMaterialsDialogOpen(true)}
          />
        </section>
        <RecipeMaterialSuggestionsDialog
          open={materialsDialogOpen}
          onOpenChange={setMaterialsDialogOpen}
          recipeId={recipe.id}
        />

        {/* Title */}
        <section className="bg-card rounded-xl p-5 shadow-card">
          <label htmlFor="recipe-edit-title" className="mb-4 flex items-center gap-3 text-body font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon name="title" size={20} />
            </span>
            Titel *
          </label>
          <input
            id="recipe-edit-title"
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(null);
            }}
            placeholder="z.B. Lagerfeuer-Stockbrot, Pfadfinder-Eintopf..."
            aria-required="true"
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'recipe-title-error' : undefined}
            className={INPUT_CLASS}
          />
          {titleError && (
            <p id="recipe-title-error" role="alert" className="mt-2 text-caption text-danger-foreground">
              {titleError}
            </p>
          )}
        </section>

        {/* Summary */}
        <section className="bg-card rounded-xl p-5 shadow-card">
          <label htmlFor="recipe-edit-summary" className="mb-4 flex items-center gap-3 text-body font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon name="short_text" size={20} />
            </span>
            Zusammenfassung
          </label>
          <textarea
            id="recipe-edit-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            placeholder="Kurze Beschreibung des Rezepts..."
            className={`${INPUT_CLASS} py-2.5 resize-none`}
          />
        </section>

        {/* Description */}
        <section className="bg-card rounded-xl p-5 shadow-card">
          <SectionHeading icon={<Icon name="description" size={20} />}>Beschreibung</SectionHeading>
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="Ausführliche Beschreibung des Rezepts in Markdown..."
          />
        </section>

        {/* Details */}
        <section className="bg-card rounded-xl p-5 shadow-card">
          <SectionHeading icon={<Icon name="tune" size={20} />}>Details</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="recipe-edit-difficulty" className="text-caption text-muted-foreground mb-1 block">Schwierigkeit</label>
              <select
                id="recipe-edit-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={SELECT_CLASS}
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
              <label htmlFor="recipe-edit-execution-time" className="text-caption text-muted-foreground mb-1 block">Kochzeit</label>
              <select
                id="recipe-edit-execution-time"
                value={executionTime}
                onChange={(e) => setExecutionTime(e.target.value)}
                className={SELECT_CLASS}
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
              <label htmlFor="recipe-edit-preparation-time" className="text-caption text-muted-foreground mb-1 block">Vorbereitung</label>
              <select
                id="recipe-edit-preparation-time"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                className={SELECT_CLASS}
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
        </section>

        {/* Tags */}
        <section className="bg-card rounded-xl p-5 shadow-card">
          <SectionHeading icon={<Icon name="label" size={20} />}>Tags</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {allTags?.map((tag) => (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selectedTagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
                className={`${CHIP_BASE} ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {tag.icon && (
                  <Icon name={tag.icon} size={16} className="mr-1" />
                )}
                {tag.name}
              </button>
            ))}
          </div>
        </section>

        {/* Scout Levels */}
        {scoutLevels && (
          <section className="bg-card rounded-xl p-5 shadow-card">
            <SectionHeading icon={<Icon name="groups" size={20} />}>Stufen</SectionHeading>
            <div className="flex flex-wrap gap-2">
              {scoutLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={selectedScoutIds.includes(level.id)}
                  onClick={() => toggleScoutLevel(level.id)}
                  className={`${CHIP_BASE} ${
                    selectedScoutIds.includes(level.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Admin Controls (Staff Only) */}
        {user?.is_staff && (
          <section className="rounded-xl border border-warning-border bg-warning-soft p-5 shadow-soft">
            <SectionHeading tone="warning" icon={<Icon name="admin_panel_settings" size={20} className="text-warning" />}>
              Admin-Kontrollen
            </SectionHeading>
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label htmlFor="recipe-admin-status" className="text-caption text-warning mb-1 block font-medium">Rezept-Status</label>
                <select
                  id="recipe-admin-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full min-h-11 px-3 py-2.5 rounded-lg border bg-card text-emphasis md:text-body focus:outline-none focus:ring-2 focus:ring-warning focus:border-warning"
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
                <label htmlFor="recipe-admin-source-url" className="text-caption text-warning mb-1 block font-medium">Quell-URL</label>
                <input
                  id="recipe-admin-source-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="z.B. https://example.com/recipe"
                  className="w-full min-h-11 px-3 py-2.5 rounded-lg border bg-card text-emphasis md:text-body focus:outline-none focus:ring-2 focus:ring-warning focus:border-warning"
                />
              </div>

              {/* Authors (Simplified: comma-separated IDs or user selection) */}
              <div>
                <label htmlFor="recipe-admin-authors" className="text-caption text-warning mb-1 block font-medium">Autoren / Mitwirkende</label>
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
                  className="w-full min-h-11 px-3 py-2.5 rounded-lg border bg-card text-emphasis md:text-body focus:outline-none focus:ring-2 focus:ring-warning focus:border-warning"
                />
                <p className="text-caption text-warning mt-1">
                  {selectedAuthorIds.length > 0
                    ? `${selectedAuthorIds.length} Autor(en) ausgewählt`
                    : 'Keine Autoren'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Submit */}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate(`/recipes/${slug}`)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-soft px-5 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/70 sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={updateRecipe.isPending}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-section font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-dark disabled:opacity-50 sm:w-auto"
          >
            <Save className="w-5 h-5" />
            {updateRecipe.isPending ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}
