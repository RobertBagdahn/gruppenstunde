/**
 * CreateRecipePage — Recipe creation using the shared ContentStepper.
 * Ingredients from URL import are saved automatically.
 * For manual creation, ingredients are added on the detail page.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ContentStepper, { type ContentFormData } from '@/components/content/ContentStepper';
import { useCreateRecipe } from '@/api/recipes';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import type { AiRefurbish } from '@/schemas/content';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  PREPARATION_TIME_OPTIONS,
} from '@/schemas/content';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useTags, useScoutLevels } from '@/api/tags';
import { useRecipeImportUrl } from '@/api/recipeImport';

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();
  const importUrl = useRecipeImportUrl();

  // Recipe-specific state
  const [recipeType, setRecipeType] = useState('warm_meal');

  // URL import state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [importUrlValue, setImportUrlValue] = useState('');
  const [importedRecipeItems, setImportedRecipeItems] = useState<Array<{
    portion_id: number;
    quantity: number;
    sort_order: number;
    note: string;
    is_optional?: boolean;
  }>>([]);

  // AI refurbish state
  const [aiRecipeItems, setAiRecipeItems] = useState<Array<{
    portion_id: number;
    quantity: number;
    sort_order: number;
    note: string;
    is_optional?: boolean;
  }>>([]);

  // Tags and scout levels for preview
  const { data: tags } = useTags();
  const { data: scoutLevels } = useScoutLevels();

  // Form data (controlled for URL import pre-fill)
  const [formData, setFormData] = useState<ContentFormData>({
    title: '',
    summary: '',
    description: '',
    difficulty: '',
    executionTime: '',
    preparationTime: '',
    selectedTagIds: [],
    selectedScoutIds: [],
  });
  // Track step externally to jump to step 1 after import
  const [importedKey, setImportedKey] = useState(0);
  const [initialStep, setInitialStep] = useState(0);

  function handleUrlImport() {
    if (!importUrlValue.trim()) return;
    importUrl.mutate(importUrlValue.trim(), {
      onSuccess: (data) => {
        setShowUrlInput(false);
        setFormData({
          title: data.recipe_draft.title,
          summary: data.recipe_draft.summary || '',
          description: data.recipe_draft.steps.join('\n\n'),
          difficulty: data.recipe_draft.difficulty || '',
          executionTime: data.recipe_draft.execution_time_choice || '',
          preparationTime: data.recipe_draft.preparation_time_choice || '',
          selectedTagIds: data.recipe_draft.tag_ids || [],
          selectedScoutIds: data.recipe_draft.scout_level_ids || [],
        });
        setRecipeType(data.recipe_draft.recipe_type || 'warm_meal');
        setInitialStep(1);
        setImportedKey((k) => k + 1);

        const servings = data.recipe_draft.servings ?? 1;
        const validItems = data.recipe_items
          .filter((item) => item.portion_id != null)
          .map((item, idx) => ({
            portion_id: item.portion_id!,
            quantity: servings > 1
              ? Math.round((item.quantity / servings) * 100) / 100
              : item.quantity,
            sort_order: idx + 1,
            note: item.note,
            is_optional: false,
          }));
        setImportedRecipeItems(validItems);

        toast.success('Rezept importiert!', {
          description: `${validItems.length} Zutaten erkannt${data.created_ingredients.length > 0 ? `, ${data.created_ingredients.length} neu angelegt` : ''}. Sie werden mit dem Rezept gespeichert.`,
        });

        const genericWarnings = data.created_ingredients.filter((ci) => ci.name_warning);
        if (genericWarnings.length > 0) {
          toast.warning('Zu generische Zutatennamen erkannt', {
            description: genericWarnings.map((ci) => ci.name_warning).join(' '),
            duration: 10000,
          });
        }
      },
      onError: (err: Error) => {
        toast.error('Import fehlgeschlagen', {
          description: err.message,
          // User stays in the URL input dialog to correct the source or cancel.
        });
      },
    });
  }

  function handleRefurbishComplete(data: AiRefurbish) {
    const items = data.suggested_ingredients
      ?.filter((ing) => ing.portion_id != null)
      .map((ing, i) => ({
        portion_id: ing.portion_id!,
        quantity: parseFloat(ing.quantity) || 1,
        sort_order: i + 1,
        note: '',
        is_optional: false,
      })) ?? [];
    setAiRecipeItems(items);
  }

  async function handleSave(formData: ContentFormData) {
    const recipeItems = importedRecipeItems.length > 0
      ? importedRecipeItems
      : aiRecipeItems.length > 0
        ? aiRecipeItems
        : undefined;

    try {
      const result = await createRecipe.mutateAsync({
        title: formData.title,
        summary: formData.summary,
        description: formData.description,
        difficulty: formData.difficulty || undefined,
        execution_time: formData.executionTime || undefined,
        preparation_time: formData.preparationTime || undefined,
        recipe_type: recipeType || undefined,
        portions: 1,
        tag_ids: formData.selectedTagIds,
        scout_level_ids: formData.selectedScoutIds,
        recipe_items: recipeItems,
      });

      toast.success('Rezept erstellt!');
      if (recipeItems) {
        navigate(`/recipes/${result.slug}`);
      } else {
        navigate(`/recipes/${result.slug}?edit=ingredients`);
      }
    } catch (err) {
      toast.error('Fehler beim Erstellen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }

  return (
    <>
      {/* URL import overlay */}
      {showUrlInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Rezept von URL importieren</h3>
            <p className="text-sm text-muted-foreground">
              Füge die URL eines Rezepts ein. Die KI analysiert das Rezept und ordnet die Zutaten zu.
            </p>
            <input
              type="url"
              value={importUrlValue}
              onChange={(e) => setImportUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
              placeholder="https://www.chefkoch.de/rezepte/..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
            {importUrl.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Rezept wird analysiert... Das kann einen Moment dauern.
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUrlImport}
                disabled={importUrl.isPending || !importUrlValue.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Importieren
              </button>
              <button
                type="button"
                onClick={() => { setShowUrlInput(false); setImportUrlValue(''); }}
                disabled={importUrl.isPending}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

    <ContentStepper
      key={importedKey}
      typeLabel="Rezept"
      typeIcon="menu_book"
      typeGradient="from-primary to-emerald-600"
      contentType="recipe"
      isSaving={createRecipe.isPending}
      onSave={handleSave}
      onRefurbishComplete={handleRefurbishComplete}
      formData={formData}
      onFormDataChange={setFormData}
      initialStep={initialStep}
      renderExtraStep0Cards={() => (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20">
            <span className="material-symbols-outlined text-[32px] text-primary">link</span>
          </div>
          <span className="font-semibold">Von URL importieren</span>
          <span className="text-xs text-muted-foreground">
            Importiere ein Rezept von einer Webseite
          </span>
        </button>
      )}
      renderTypeFields={() => (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <h3 className="text-sm font-medium">Rezept-Details</h3>

            {/* Recipe type grid */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Rezeptart</label>
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

          </div>

          {/* Ingredients warning */}
          <div className="mb-6 rounded-xl border border-amber-300/60 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-[22px] mt-0.5 shrink-0">info</span>
              <div>
                <p className="text-sm font-medium text-amber-800">Zutaten nach dem Erstellen hinzufügen</p>
                <p className="text-xs text-amber-700 mt-1">
                  Zutaten können später im Zutaten-Editor hinzugefügt werden. Zum Veröffentlichen
                  wird mindestens eine Zutat benötigt.
                </p>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-[hsl(var(--chart-3))]/10 rounded-lg border border-[hsl(var(--chart-3))]/20 p-4">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[hsl(var(--chart-3))] text-[20px] mt-0.5">info</span>
              <p className="text-xs text-[hsl(var(--chart-3))]">
                Bilder und weitere Details kannst du nach dem Erstellen hinzufügen.
                Das Rezept wird als Entwurf gespeichert.
              </p>
            </div>
          </div>
        </div>
      )}
      hideDefaultPreviewBody
      renderPreviewExtras={(fd) => {
        const getLabel = (options: readonly { value: string; label: string }[], value: string) =>
          options.find((o) => o.value === value)?.label ?? value;

        return (
          <div className="space-y-6">
            {/* Recipe type */}
            {recipeType && (
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                  <span className="material-symbols-outlined text-[16px]">restaurant</span>
                  {RECIPE_TYPE_OPTIONS.find((o) => o.value === recipeType)?.label ?? recipeType}
                </span>
              </div>
            )}

            {/* KPI Grid 2×2 */}
            {(fd.difficulty || fd.executionTime || fd.preparationTime) && (
              <div className="grid grid-cols-2 gap-3">
                {fd.difficulty && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <span className="material-symbols-outlined text-[20px] text-muted-foreground">signal_cellular_alt</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Schwierigkeit</p>
                      <p className="text-sm font-medium">{getLabel(DIFFICULTY_OPTIONS, fd.difficulty)}</p>
                    </div>
                  </div>
                )}
                {fd.executionTime && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <span className="material-symbols-outlined text-[20px] text-muted-foreground">schedule</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Kochzeit</p>
                      <p className="text-sm font-medium">{getLabel(EXECUTION_TIME_OPTIONS, fd.executionTime)}</p>
                    </div>
                  </div>
                )}
                {fd.preparationTime && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <span className="material-symbols-outlined text-[20px] text-muted-foreground">timer</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Vorbereitung</p>
                      <p className="text-sm font-medium">{getLabel(PREPARATION_TIME_OPTIONS, fd.preparationTime)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description / Zubereitung */}
            {fd.description && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  Zubereitung
                </h4>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={fd.description} />
                </div>
              </div>
            )}

            {/* Tags */}
            {fd.selectedTagIds.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">label</span>
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {fd.selectedTagIds.map((id) => (
                    <span key={id} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {tags?.find((t) => t.id === id)?.name ?? `Tag ${id}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scout levels */}
            {fd.selectedScoutIds.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">hiking</span>
                  Pfadfinderstufen
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {fd.selectedScoutIds
                    .map((id) => scoutLevels?.find((s) => s.id === id))
                    .filter((s): s is NonNullable<typeof s> => s != null)
                    .map((s) => (
                      <span key={s.id} className="px-2.5 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium">
                        {s.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      }}
    />
    </>
  );
}
