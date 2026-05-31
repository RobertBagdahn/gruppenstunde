import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
import { EntityLink } from '@/components/shared/EntityLink';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useBlocker } from '@/hooks/useBlocker';
import { useCreateFromRecipe } from '@/api/shoppingLists';
import { useCurrentUser } from '@/api/auth';
import { useAvailableConversions } from '@/api/supplies';
import {
  useRecipeBySlug,
  useRecipeComments,
  useCreateRecipeComment,
  useRecipeEmotion,
  useRecipeNutriScore,
  useRecipeNutritionBreakdown,
  useUpdateRecipe,
  useDeleteRecipe,
  useForkRecipe,
  useForkAndSaveRecipe,
  useUpdateVisibility,
  useUploadRecipeImage,
  useDeleteRecipeImage,
  useSetRecipeImageFromUrl,
} from '@/api/recipes';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_PREPARATION_TIME_OPTIONS,
} from '@/schemas/recipe';
import type { RecipeItemNutrition } from '@/schemas/recipe';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorDisplay from '@/components/ErrorDisplay';
import ContentComments from '@/components/content/ContentComments';
import ContentEmotions from '@/components/content/ContentEmotions';
import ContentAuthorSection from '@/components/content/ContentAuthorSection';
import InlineEditor from '@/components/content/InlineEditor';
import TitleImageEditor from '@/components/content/TitleImageEditor';
import IngredientList from '@/components/supply/IngredientList';
import InlineIngredientEditor from '@/components/recipe/InlineIngredientEditor';
import { ContentLinkSection } from '@/components/content/ContentLinkSection';
import ConfirmDialog from '@/components/ConfirmDialog';
import Breadcrumb from '@/components/Breadcrumb';
import RecipeImprovements from '@/components/recipe/RecipeImprovements';
import RecipeBadge from '@/components/recipe/RecipeBadge';
import RecipeHeaderInfo from '@/components/recipe/RecipeHeaderInfo';
import RecipeSidebar from '@/components/recipe/RecipeSidebar';
import RecipeMobileActionBar from '@/components/recipe/RecipeMobileActionBar';
import RecipeCookingMode from '@/pages/recipes/RecipeCookingMode';
import PortionBottomSheet from '@/components/recipe/PortionBottomSheet';
// import { PositiveTraitsBadges } from '@/components/recipe/PositiveTraitsBadges';
import { NutritionContributionPanel, PARAMETER_LABELS } from '@/components/recipe/NutritionContributionPanel';
import { useRecipeModificationStore } from '@/store/useRecipeModificationStore';
import { toast } from 'sonner';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { formatWeight } from '@/utils/formatWeight';

const LazyNutritionPieChart = lazy(() => import('@/components/charts/NutritionPieChart'));

// Scout level colors
const SCOUT_LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Wölflinge: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  Jungpfadfinder: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  Pfadfinder: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  Rover: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
};

// Nutri-Score colors
const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

// --- Collapsible Section Component ---
function AnalysisSection({
  icon,
  title,
  defaultOpen = false,
  children,
  accentColor = 'text-primary',
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-6 bg-card rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-5 text-left hover:bg-muted/50 transition-colors"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <span className={`material-symbols-outlined text-[18px] ${accentColor}`}>{icon}</span>
          {title}
        </h2>
        <span
          className={`material-symbols-outlined text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </section>
  );
}

// --- Macro Bar Component ---
function MacroBar({
  label,
  value,
  max,
  color,
  unit = 'g',
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value.toFixed(1)} {unit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
         />
      </div>
    </div>
  );
}

// --- Collapsible Micronutrient Section (Vitamins / Minerals) ---
function MicronutrientSection({
  title,
  icon,
  accentColor,
  nutrients,
  dgeCoverage,
  servings,
}: {
  title: string;
  icon: string;
  accentColor: string;
  nutrients: Array<{
    label: string;
    value: number | null | undefined;
    unit: string;
    dgeKey: string;
  }>;
  dgeCoverage: Record<string, number | null>;
  servings: number;
}) {
  const [open, setOpen] = useState(false);
  const hasAnyValue = nutrients.some((n) => n.value != null && n.value > 0);
  if (!hasAnyValue) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className={`material-symbols-outlined text-base ${accentColor}`}>{icon}</span>
          {title}
        </span>
        <span
          className={`material-symbols-outlined text-muted-foreground text-base transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {nutrients.map((n) => {
            if (n.value == null || n.value <= 0) return null;
            const perServing = n.value / servings;
            const coverage = dgeCoverage[n.dgeKey] ?? null;
            return (
              <div key={n.dgeKey} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{n.label}</span>
                  <span className="text-muted-foreground">
                    {perServing < 0.1 ? perServing.toFixed(3) : perServing.toFixed(1)} {n.unit}/Portion
                    {coverage != null && (
                      <span className={`ml-2 font-semibold ${coverage >= 80 ? 'text-green-600' : coverage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {coverage.toFixed(0)}% DGE
                      </span>
                    )}
                  </span>
                </div>
                {coverage != null && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        coverage >= 80 ? 'bg-green-500' : coverage >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(coverage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Collapsible accordion showing per-parameter contribution panels. */
function CollapsibleContributions({ items }: { items: RecipeItemNutrition[] }) {
  const [openParam, setOpenParam] = useState<string | null>(null);

  const parameters = ['energy', 'protein', 'fat', 'sat_fat', 'carbs', 'sugar', 'salt', 'fiber'] as const;
  const units: Record<string, string> = {
    energy: 'kJ', protein: 'g', fat: 'g', sat_fat: 'g',
    carbs: 'g', sugar: 'g', salt: 'g', fiber: 'g',
  };

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Zutaten-Beiträge pro Nährwert</h3>
      <div className="border rounded-lg divide-y">
        {parameters.map((param) => {
          const isOpen = openParam === param;
          return (
            <div key={param}>
              <button
                onClick={() => setOpenParam(isOpen ? null : param)}
                className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium">{PARAMETER_LABELS[param] ?? param}</span>
                <span
                  className={`material-symbols-outlined text-muted-foreground text-base transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                  expand_more
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  <NutritionContributionPanel
                    parameter={param}
                    items={items}
                    unit={units[param]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  const { data: recipe, isLoading, error, refetch } = useRecipeBySlug(slug ?? '');
  const recipeId = recipe?.id ?? 0;

  const { data: comments } = useRecipeComments(recipeId);
  const createComment = useCreateRecipeComment(recipeId);
  const createEmotion = useRecipeEmotion(recipeId);
  const updateRecipe = useUpdateRecipe(recipeId);
  const deleteRecipe = useDeleteRecipe();
  const { data: nutriScore } = useRecipeNutriScore(recipeId);
  const { data: nutritionBreakdown } = useRecipeNutritionBreakdown(recipeId);
  const forkRecipe = useForkRecipe(recipeId);
  const forkAndSaveRecipe = useForkAndSaveRecipe(recipeId);
  const updateVisibility = useUpdateVisibility(recipeId);
  const uploadImage = useUploadRecipeImage(recipeId);
  const deleteImage = useDeleteRecipeImage(recipeId);
  const setImageFromUrl = useSetRecipeImageFromUrl(recipeId);

  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShoppingExport, setShowShoppingExport] = useState(false);
  const [exportServings, setExportServings] = useState(1);
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState<string | null>(null);
  const [portionSheetOpen, setPortionSheetOpen] = useState(false);
  const [isInlineEditMode, setIsInlineEditMode] = useState(false);

  // Zubereitung section: default open on desktop (>=1024px), closed on mobile
  const [descriptionDefaultOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );

  const { data: currentUser } = useCurrentUser();
  const createFromRecipe = useCreateFromRecipe();

  // Unit conversion data for ingredient display
  // Request conversions from g (base unit) since IngredientList displays in grams
  const conversionRequestItems = useMemo(() => {
    const items = recipe?.recipe_items ?? [];
    // Deduplicate by ingredient_id (same ingredient, same conversions)
    const seen = new Set<number>();
    return items
      .filter((item) => {
        if (!item.ingredient_id || seen.has(item.ingredient_id)) return false;
        seen.add(item.ingredient_id);
        return true;
      })
      .map((item) => ({
        ingredient_id: item.ingredient_id!,
        from_unit_id: 14, // g unit — IngredientList calculates weightG
        quantity: 1, // normalized; actual scaling happens in UnitSwitcher
      }));
  }, [recipe?.recipe_items]);

  const { data: availableConversions } = useAvailableConversions(
    conversionRequestItems,
    conversionRequestItems.length > 0,
  );

  // Recipe modification store
  const isDirty = useRecipeModificationStore((s) => s.isDirty);
  const modifiedItems = useRecipeModificationStore((s) => s.modifiedItems);
  const modifiedServings = useRecipeModificationStore((s) => s.modifiedServings);
  const initializeModifications = useRecipeModificationStore((s) => s.initialize);
  const resetModifications = useRecipeModificationStore((s) => s.reset);
  const scaleToNormPortion = useRecipeModificationStore((s) => s.scaleToNormPortion);

  // Initialize modification store when nutrition breakdown data loads
  useEffect(() => {
    if (nutritionBreakdown && recipe && !isDirty) {
      initializeModifications(nutritionBreakdown.items, recipe.servings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nutritionBreakdown, recipe, initializeModifications]);

  // Leave confirmation when modifications are present (10.6)
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useDocumentMeta({
    title: recipe?.title,
    description: recipe?.summary,
    url: slug ? `/recipes/${slug}` : undefined,
    image: recipe?.image_url,
  });

  // Nutrition helpers — use modified items when store is dirty
  // Must be before early returns to maintain consistent hook order
  const nb = useMemo(() => {
    if (!nutritionBreakdown) return null;
    if (!isDirty) return nutritionBreakdown;

    // Recompute totals from modified items
    const items = modifiedItems;
    const totalWeightG = items.reduce((s, i) => s + i.weight_g, 0);
    const totalPriceItems = items.filter((i) => i.price_eur !== null);
    const totalPriceEur = totalPriceItems.length > 0 ? totalPriceItems.reduce((s, i) => s + (i.price_eur ?? 0), 0) : null;
    const totalEnergyKj = items.reduce((s, i) => s + i.energy_kj, 0);
    const totalEnergyKcal = items.reduce((s, i) => s + i.energy_kcal, 0);
    const totalProteinG = items.reduce((s, i) => s + i.protein_g, 0);
    const totalFatG = items.reduce((s, i) => s + i.fat_g, 0);
    const totalFatSatG = items.reduce((s, i) => s + i.fat_sat_g, 0);
    const totalCarbohydrateG = items.reduce((s, i) => s + i.carbohydrate_g, 0);
    const totalSugarG = items.reduce((s, i) => s + i.sugar_g, 0);
    const totalFibreG = items.reduce((s, i) => s + i.fibre_g, 0);
    const totalSaltG = items.reduce((s, i) => s + i.salt_g, 0);
    const servings = modifiedServings ?? 1;

    // Recompute weight_pct
    const itemsWithPct = items.map((i) => ({
      ...i,
      weight_pct: totalWeightG > 0 ? (i.weight_g / totalWeightG) * 100 : 0,
    }));

    return {
      total_weight_g: totalWeightG,
      total_price_eur: totalPriceEur,
      total_energy_kj: totalEnergyKj,
      total_energy_kcal: totalEnergyKcal,
      total_protein_g: totalProteinG,
      total_fat_g: totalFatG,
      total_fat_sat_g: totalFatSatG,
      total_carbohydrate_g: totalCarbohydrateG,
      total_sugar_g: totalSugarG,
      total_fibre_g: totalFibreG,
      total_salt_g: totalSaltG,
      // Micronutrient totals (from modified items)
      total_vitamin_c_mg: items.reduce((s, i) => s + (i.vitamin_c_mg ?? 0), 0) || null,
      per_serving_energy_kcal: totalEnergyKcal / servings,
      per_serving_protein_g: totalProteinG / servings,
      per_serving_fat_g: totalFatG / servings,
      per_serving_carbohydrate_g: totalCarbohydrateG / servings,
      dge_coverage: nutritionBreakdown.dge_coverage ?? {},
      items: itemsWithPct,
    };
  }, [nutritionBreakdown, isDirty, modifiedItems, modifiedServings]);
  const effectiveServings = (isDirty ? modifiedServings : recipe?.servings) ?? 1;
  const topIngredientsByWeight = nb
    ? [...nb.items].sort((a, b) => b.weight_g - a.weight_g)
    : [];
  const topIngredientsByPrice = nb
    ? [...nb.items].filter((i) => i.price_eur !== null).sort((a, b) => (b.price_eur ?? 0) - (a.price_eur ?? 0))
    : [];
  const topIngredientsByCalories = nb
    ? [...nb.items].sort((a, b) => b.energy_kcal - a.energy_kcal)
    : [];

  // Build ingredient_id → slug lookup from recipe items for nutrition links
  // Must be before early returns to maintain consistent hook order
  const ingredientSlugById = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of recipe?.recipe_items ?? []) {
      if (item.ingredient_id && item.ingredient_slug) {
        map.set(item.ingredient_id, item.ingredient_slug);
      }
    }
    return map;
  }, [recipe?.recipe_items]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container py-8">
        <ErrorDisplay
          error={error}
          title="Rezept nicht gefunden"
          onRetry={() => refetch()}
          onBack={() => navigate(-1)}
          backLabel="Zurück"
        />
      </div>
    );
  }

  // Cooking Mode — render fullscreen overlay, skip everything else
  if (mode === 'cooking') {
    return (
      <RecipeCookingMode
        recipe={recipe}
        servingsMultiplier={servingsMultiplier}
        onServingsChange={setServingsMultiplier}
      />
    );
  }


  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel =
    RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === recipe.execution_time)?.label ??
    recipe.execution_time;
  const prepTimeLabel =
    RECIPE_PREPARATION_TIME_OPTIONS.find((p) => p.value === recipe.preparation_time)?.label ??
    recipe.preparation_time;

  // Group tags by parent
  const topicTags = recipe.tags.filter((t) => t.parent_name === 'Themen');

  // Reusable handler to open the shopping list export dialog
  const handleOpenShoppingList = () => {
    setExportServings(servingsMultiplier);
    setShowShoppingExport(true);
  };

  return (
    <EntityLinkContext.Provider value="detail">
    <article
      className="container py-8 mx-auto max-w-7xl lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 pb-20 lg:pb-0"
      {...(mode === 'print' ? { 'data-mode': 'print' } : {})}
    >
      <main className="min-w-0 max-w-3xl">
      {/* Print toolbar */}
      {mode === 'print' && (
        <div className="no-print flex items-center justify-between gap-4 mb-6 p-3 bg-muted rounded-lg border">
          <BackButton onClick={() => {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('mode');
                return next;
              }, { replace: true });
            }} />
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Drucken
          </button>
        </div>
      )}
      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteRecipe.mutate(recipeId, {
            onSuccess: () => {
              toast.success('Rezept gelöscht');
              setShowDeleteConfirm(false);
              navigate('/recipes');
            },
            onError: (err) => {
              toast.error('Fehler beim Löschen', { description: err.message });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Rezept löschen?"
        description="Das Rezept wird gelöscht und ist nicht mehr sichtbar."
        confirmLabel="Löschen"
        loading={deleteRecipe.isPending}
      />

      {/* Leave Confirmation when modifications present (10.6) */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        title="Änderungen verwerfen?"
        description="Du hast das Rezept modifiziert. Wenn du die Seite verlässt, gehen alle Änderungen verloren."
        confirmLabel="Verwerfen"
      />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Startseite', href: '/' },
          { label: 'Rezepte', href: '/recipes' },
          { label: recipe.title },
        ]}
      />

      {/* Recipe Type Badge + Recipe Badge */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {typeOpt && (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 uppercase tracking-wide bg-rose-50 rounded-full px-3 py-1 border border-rose-200">
            <span className="material-symbols-outlined text-[16px]">{typeOpt.icon}</span>
            {typeOpt.label}
          </p>
        )}
        <RecipeBadge badge={recipe.recipe_badge} />
      </div>

      {/* Title + Edit + Delete */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{recipe.title}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {recipe.can_edit && (
            <Link
              to={`/recipes/${recipe.slug}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              title="Rezept bearbeiten"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="hidden sm:inline">Bearbeiten</span>
            </Link>
          )}
          {recipe.can_delete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
              title="Rezept löschen"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span className="hidden sm:inline">Löschen</span>
            </button>
          )}
        </div>
      </div>

      {/* Source URL */}
      {recipe.source_url && (
        <div className="mt-2">
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
            Originalrezept
          </a>
        </div>
      )}

      {/* Hero Image */}
      <div className="mt-6">
        <TitleImageEditor
          contentType="recipe"
          imageUrl={recipe.image_url}
          canEdit={recipe.can_edit}
          title={recipe.title}
          summary={recipe.summary}
          fallbackImage="/images/inspi_cook.png"
          uploadMutation={uploadImage}
          deleteMutation={deleteImage}
          setFromUrlMutation={setImageFromUrl}
        />
      </div>

      {/* Modification Indicator (10.5) + Save Buttons */}
      {isDirty && (
        <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">edit_note</span>
              <span className="text-sm font-medium text-amber-800">Rezept modifiziert</span>
            </div>
            <button
              type="button"
              onClick={resetModifications}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
            >
              Zurücksetzen
            </button>
          </div>

          {/* Save actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Fork as new version — available to all logged-in users */}
            {currentUser && (
              <button
                type="button"
                disabled={forkAndSaveRecipe.isPending}
                onClick={() => {
                  const itemsPayload = modifiedItems.map((mod) => {
                    const orig = recipe.recipe_items?.find((ri) => ri.id === mod.recipe_item_id);
                    return {
                      portion_id: orig?.portion_id ?? null,
                      ingredient_id: mod.ingredient_id,
                      quantity: mod.quantity,
                      measuring_unit_id: orig?.measuring_unit_id ?? null,
                      sort_order: orig?.sort_order ?? 0,
                      note: orig?.note ?? '',
                    };
                  });
                  forkAndSaveRecipe.mutate(
                    { servings: modifiedServings, recipe_items: itemsPayload },
                    {
                      onSuccess: (savedRecipe) => {
                        resetModifications();
                        toast.success('Neue Version gespeichert');
                        navigate(`/recipes/${savedRecipe.slug}`);
                      },
                      onError: (err) => {
                        toast.error('Fehler beim Speichern', { description: err.message });
                      },
                    },
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                {forkAndSaveRecipe.isPending ? 'Wird gespeichert...' : 'Als neue Version speichern'}
              </button>
            )}

            {/* Update current recipe — only for owner/admin */}
            {recipe.can_edit && (
              <button
                type="button"
                disabled={updateRecipe.isPending}
                onClick={() => {
                  const itemsPayload = modifiedItems.map((mod) => {
                    const orig = recipe.recipe_items?.find((ri) => ri.id === mod.recipe_item_id);
                    return {
                      portion_id: orig?.portion_id ?? null,
                      ingredient_id: mod.ingredient_id,
                      quantity: mod.quantity,
                      measuring_unit_id: orig?.measuring_unit_id ?? null,
                      sort_order: orig?.sort_order ?? 0,
                      note: orig?.note ?? '',
                    };
                  });
                  updateRecipe.mutate(
                    {
                      servings: modifiedServings ?? undefined,
                      recipe_items: itemsPayload,
                    },
                    {
                      onSuccess: () => {
                        resetModifications();
                        toast.success('Rezept aktualisiert');
                      },
                      onError: (err) => {
                        toast.error('Fehler beim Aktualisieren', { description: err.message });
                      },
                    },
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {updateRecipe.isPending ? 'Wird gespeichert...' : 'Rezept aktualisieren'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Portion Normalization Hint (10.4) */}
      {nb && (isDirty ? modifiedServings : recipe.servings) && (isDirty ? modifiedServings : recipe.servings)! > 0 && (() => {
        // DGE reference: 15yo male, PAL 1.5 = 12000 kJ daily
        const dailyEnergyKj = 12000;
        const mealFractions: Record<string, number> = {
          breakfast: 0.25, warm_meal: 0.35, cold_meal: 0.25,
          dessert: 0.10, side_dish: 0.10, snack: 0.10, drink: 0.05,
        };
        const fraction = mealFractions[recipe.recipe_type] ?? 0.30;
        const expectedEnergyKj = dailyEnergyKj * fraction;
        const effectiveServings = (isDirty ? modifiedServings : recipe.servings) ?? 1;
        const perServingEnergyKj = nb.total_energy_kj / effectiveServings;
        const ratio = perServingEnergyKj / expectedEnergyKj;

        if (ratio > 1.5) {
          const normFactor = expectedEnergyKj / perServingEnergyKj;
          return (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-orange-300 bg-orange-50 p-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-orange-600 mt-0.5">warning</span>
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Diese Portion ist größer als eine Normportion
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Energie pro Portion: {Math.round(perServingEnergyKj)} kJ (Referenz: {Math.round(expectedEnergyKj)} kJ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => scaleToNormPortion(normFactor)}
                className="shrink-0 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 transition-colors"
              >
                Auf Normportion skalieren
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Info Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {/* Scout Levels */}
        {recipe.scout_levels.length > 0 ? (
          <div className="flex flex-col items-center text-center gap-2 bg-rose-50 rounded-xl border border-rose-200 p-5">
            <span className="material-symbols-outlined text-3xl text-rose-600">groups</span>
            <div className="flex flex-wrap justify-center gap-1">
              {recipe.scout_levels.map((level) => {
                const colors = SCOUT_LEVEL_COLORS[level.name] ?? {
                  bg: 'bg-muted',
                  border: 'border-border',
                  text: 'text-foreground',
                };
                return (
                  <span
                    key={level.id}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.border} ${colors.text} border`}
                  >
                    {level.name}
                  </span>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">Altersgruppe</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-5">
            <span className="material-symbols-outlined text-3xl text-rose-600">groups</span>
            <span className="text-base font-bold">Für alle</span>
            <span className="text-xs text-muted-foreground">Altersgruppe</span>
          </div>
        )}

        {/* Nutri-Score Badge */}
        {recipe.cached_nutri_class != null && (() => {
          const label = ['A', 'B', 'C', 'D', 'E'][recipe.cached_nutri_class - 1];
          const colors = label ? NUTRI_SCORE_COLORS[label] : null;
          if (!colors) return null;
          return (
            <div className="flex flex-col items-center text-center gap-2 bg-card rounded-xl border p-5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Nutri-Score</span>
              <span className={`${colors.bg} ${colors.text} text-2xl font-extrabold px-5 py-2 rounded-md`}>
                {label}
              </span>
            </div>
          );
        })()}

        {/* Views */}
        <div className="flex flex-col items-center text-center gap-1 bg-violet-50 rounded-xl border border-violet-200 p-5">
          <span className="material-symbols-outlined text-3xl text-violet-600">visibility</span>
          <span className="text-base font-bold">{recipe.view_count}</span>
          <span className="text-xs text-muted-foreground">Aufrufe</span>
        </div>

        {/* Like Score */}
        <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-5">
          <span
            className="material-symbols-outlined text-3xl text-rose-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          <span className="text-base font-bold">{recipe.like_score}</span>
          <span className="text-xs text-muted-foreground">Likes</span>
        </div>
      </div>

      {/* Header Info (Nutri + Price) — mobile only, desktop uses sidebar */}
      <div className="mt-4">
        <RecipeHeaderInfo
          nutriClass={recipe.cached_nutri_class}
          priceTotal={recipe.cached_price_total}
        />
      </div>

      {/* Summary */}
      {recipe.summary && (
        <InlineEditor
          mode="textarea"
          label="Zusammenfassung"
          value={recipe.summary}
          canEdit={recipe.can_edit ?? false}
          aiField="summary"
          onSave={(val) => updateRecipe.mutateAsync({ summary: val })}
          isSaving={updateRecipe.isPending}
          className="mt-6"
        >
          <div className="bg-card rounded-xl border p-5">
            <MarkdownRenderer content={recipe.summary} className="text-lg font-semibold italic" />
          </div>
        </InlineEditor>
      )}

      {/* Topic Tags */}
      {topicTags.length > 0 && (
        <section className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[18px]">label</span>
            Themen
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {topicTags.map((tag) => (
              <EntityLink
                key={tag.id}
                type="tag"
                slug={tag.slug}
                name={tag.name}
                variant="chip"
              />
            ))}
          </div>
        </section>
      )}

      {/* KPI Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-5">
          <span className="material-symbols-outlined text-3xl text-rose-600">signal_cellular_alt</span>
          <span className="text-base font-bold">{difficultyLabel}</span>
          <span className="text-xs text-muted-foreground">Schwierigkeit</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-teal-50 rounded-xl border border-teal-200 p-5">
          <span className="material-symbols-outlined text-3xl text-teal-600">timer</span>
          <span className="text-base font-bold">{timeLabel}</span>
          <span className="text-xs text-muted-foreground">Kochzeit</span>
        </div>
        {recipe.cached_price_total != null && (
          <div className="flex flex-col items-center text-center gap-1 bg-yellow-50 rounded-xl border border-yellow-200 p-5">
            <span className="material-symbols-outlined text-3xl text-yellow-600">euro</span>
            <span className="text-base font-bold">
              {(recipe.cached_price_total * (servingsMultiplier / (recipe.servings ?? 1))).toLocaleString('de-DE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} €
            </span>
            <span className="text-xs text-muted-foreground">Gesamtkosten</span>
          </div>
        )}
        <div className="flex flex-col items-center text-center gap-1 bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <span className="material-symbols-outlined text-3xl text-indigo-600">pending_actions</span>
          <span className="text-base font-bold">{prepTimeLabel}</span>
          <span className="text-xs text-muted-foreground">Vorbereitungszeit</span>
        </div>
      </div>

      {/* Recipe Items (Ingredients) — using IngredientList component */}
      <section className="mt-8 bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <span className="material-symbols-outlined text-rose-500">egg_alt</span>
            Zutaten
            {!isInlineEditMode && (
              <span className="text-sm font-normal text-muted-foreground">
                {servingsMultiplier === 1 ? 'pro Portion' : `für ${servingsMultiplier} Portionen`}
              </span>
            )}
          </h2>
          {recipe.can_edit && !isInlineEditMode && (
            <button
              type="button"
              onClick={() => setIsInlineEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
              title="Zutaten bearbeiten"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Bearbeiten
            </button>
          )}
        </div>

        {isInlineEditMode ? (
          <InlineIngredientEditor
            recipeId={recipe.id}
            items={recipe.recipe_items ?? []}
            servings={recipe.servings}
            onClose={() => setIsInlineEditMode(false)}
            onSaved={() => {
              setIsInlineEditMode(false);
              refetch();
            }}
          />
        ) : (
          <IngredientList
            items={isDirty
              ? (recipe.recipe_items ?? []).map((item) => {
                  const mod = modifiedItems.find((m) => m.recipe_item_id === item.id);
                  return mod ? { ...item, quantity: mod.quantity } : item;
                })
              : (recipe.recipe_items ?? [])}
            servings={isDirty ? (modifiedServings ?? recipe.servings) : recipe.servings}
            servingsMultiplier={isDirty ? 1 : (servingsMultiplier / (recipe.servings ?? 1))}
            availableConversions={availableConversions?.items}
          />
        )}

        {/* Export to Shopping List */}
        {currentUser && (
          <div className="mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={handleOpenShoppingList}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full justify-center md:w-auto"
            >
              <span className="material-symbols-outlined text-[18px]">
                shopping_cart
              </span>
              Zur Einkaufsliste
            </button>
          </div>
        )}
      </section>

      {/* Nutritional Tags */}
      {recipe.nutritional_tags && recipe.nutritional_tags.length > 0 && (
        <section className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[18px]">nutrition</span>
            Allergene & Ernährungshinweise
          </h2>
          <div className="flex flex-wrap gap-2">
            {recipe.nutritional_tags?.map((nt) => (
              <span
                key={nt.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 text-sm font-medium"
              >
                {nt.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Shopping List Export Dialog */}
      {showShoppingExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 mx-4 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
              Einkaufsliste erstellen
            </h3>
            <label className="block text-sm text-muted-foreground mb-1">
              Anzahl Portionen
            </label>
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setExportServings(Math.max(1, exportServings - 1))}
                className="w-10 h-10 flex items-center justify-center border rounded-lg hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <input
                type="number"
                min={1}
                max={999}
                value={exportServings}
                onChange={(e) => setExportServings(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center text-lg font-semibold border rounded-lg py-2 bg-background"
              />
              <button
                type="button"
                onClick={() => setExportServings(exportServings + 1)}
                className="w-10 h-10 flex items-center justify-center border rounded-lg hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={createFromRecipe.isPending}
                onClick={() => {
                  createFromRecipe.mutate(
                    { recipeId: recipe.id, servings: exportServings },
                    {
                      onSuccess: (created) => {
                        toast.success('Einkaufsliste erstellt');
                        setShowShoppingExport(false);
                        navigate(`/shopping-lists/${created.id}`);
                      },
                      onError: (err) =>
                        toast.error('Fehler', { description: err.message }),
                    },
                  );
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createFromRecipe.isPending ? 'Erstelle...' : 'Erstellen'}
              </button>
              <button
                type="button"
                onClick={() => setShowShoppingExport(false)}
                className="px-4 py-2.5 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {recipe.description && (
        <InlineEditor
          mode="markdown"
          label="Zubereitung"
          value={recipe.description}
          canEdit={recipe.can_edit ?? false}
          aiField="description"
          onSave={(val) => updateRecipe.mutateAsync({ description: val })}
          isSaving={updateRecipe.isPending}
          className="mt-6"
        >
          <AnalysisSection
            icon="description"
            title="Zubereitung"
            defaultOpen={descriptionDefaultOpen}
            accentColor="text-primary"
          >
            <MarkdownRenderer content={recipe.description} />
          </AnalysisSection>
        </InlineEditor>
      )}

      {/* Long Summary */}
      {recipe.summary_long && (
        <div className="mt-6 bg-card rounded-xl border p-6">
          <MarkdownRenderer content={recipe.summary_long} />
        </div>
      )}

      {/* Als persönliches Rezept speichern (12.6) */}
      {currentUser && !recipe.can_edit && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              forkRecipe.mutate(undefined, {
                onSuccess: (forkedRecipe) => {
                  toast.success('Rezept als persönliche Kopie gespeichert');
                  navigate(`/recipes/${forkedRecipe.slug}`);
                },
                onError: (err) => {
                  toast.error('Fehler beim Speichern', { description: err.message });
                },
              });
            }}
            disabled={forkRecipe.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">content_copy</span>
            {forkRecipe.isPending ? 'Wird gespeichert...' : 'Als persönliches Rezept speichern'}
          </button>
        </div>
      )}

      {/* Visibility UI for recipe owner (13.6) */}
      {recipe.is_owner && recipe.visibility && (
        <div className="mt-6 bg-card rounded-xl border p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            Sichtbarkeit
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <select
              value={recipe.visibility}
              onChange={(e) => setShowVisibilityConfirm(e.target.value)}
              className="w-full sm:w-auto rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="private">Privat – nur für mich</option>
              <option value="group">Gruppe – für meine Gruppe</option>
              <option value="public">Öffentlich – für alle sichtbar</option>
            </select>
            <span className="text-xs text-muted-foreground">
              {recipe.visibility === 'private' && 'Nur du kannst dieses Rezept sehen.'}
              {recipe.visibility === 'group' && 'Mitglieder deiner Gruppe können dieses Rezept sehen.'}
              {recipe.visibility === 'public' && 'Dieses Rezept ist für alle sichtbar.'}
            </span>
          </div>
        </div>
      )}

      {/* Visibility Change Confirmation (13.6) */}
      <ConfirmDialog
        open={showVisibilityConfirm !== null}
        onConfirm={() => {
          if (showVisibilityConfirm) {
            updateVisibility.mutate(showVisibilityConfirm, {
              onSuccess: () => {
                toast.success('Sichtbarkeit geändert');
                setShowVisibilityConfirm(null);
              },
              onError: (err) => {
                toast.error('Fehler', { description: err.message });
                setShowVisibilityConfirm(null);
              },
            });
          }
        }}
        onCancel={() => setShowVisibilityConfirm(null)}
        title="Sichtbarkeit ändern?"
        description={
          showVisibilityConfirm === 'public'
            ? 'Wenn du das Rezept öffentlich machst, wird es zur Prüfung eingereicht und ist nach Freigabe für alle sichtbar.'
            : showVisibilityConfirm === 'group'
              ? 'Das Rezept wird für Mitglieder deiner Gruppe sichtbar.'
              : 'Das Rezept wird nur noch für dich sichtbar sein.'
        }
        confirmLabel="Ändern"
        loading={updateVisibility.isPending}
      />

      {/* ============================================================ */}
      {/* ANALYSIS SECTIONS (collapsible) */}
      {/* ============================================================ */}

      {/* --- Preis-Analyse --- */}
      {nb && nb.total_price_eur !== null && nb.total_price_eur > 0 && (
        <AnalysisSection icon="euro" title="Preis-Analyse" accentColor="text-yellow-600">
          <div className="space-y-6">
            {/* Price overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <p className="text-2xl font-extrabold text-yellow-700">
                  {nb.total_price_eur.toFixed(2)} EUR
                </p>
                <p className="text-xs text-muted-foreground mt-1">Gesamtpreis</p>
              </div>
              {recipe.servings && (
                <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-2xl font-extrabold text-emerald-700">
                    {(nb.total_price_eur / effectiveServings).toFixed(2)} EUR
                  </p>
                </div>
              )}
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-2xl font-extrabold text-blue-700">
                  {nb.items.filter((i) => i.price_eur !== null).length} / {nb.items.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Zutaten mit Preis</p>
              </div>
            </div>

            {/* Price breakdown table */}
            {topIngredientsByPrice.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Kosten nach Zutat</h3>
                <div className="space-y-2">
                  {topIngredientsByPrice.map((item) => (
                    <PriceRow
                      key={item.recipe_item_id}
                      item={item}
                      totalPrice={nb.total_price_eur ?? 1}
                      ingredientSlugById={ingredientSlugById}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </AnalysisSection>
      )}

      {/* --- Inhaltsstoffanalyse (Nutritional Breakdown) --- */}
      {nb && nb.total_weight_g > 0 && (
        <AnalysisSection
          icon="science"
          title="Inhaltsstoffanalyse"
          accentColor="text-violet-600"
        >
          <div className="space-y-6">
            {/* Macro overview per serving */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Nährwerte pro Portion{' '}
                <span className="font-normal text-muted-foreground">
                  ({formatWeight(nb.total_weight_g / effectiveServings)})
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NutrientCard
                  label="Kalorien"
                  value={nb.per_serving_energy_kcal ?? 0}
                  unit="kcal"
                  icon="local_fire_department"
                  color="text-orange-600"
                  bgColor="bg-orange-50 border-orange-200"
                />
                <NutrientCard
                  label="Protein"
                  value={nb.per_serving_protein_g ?? 0}
                  unit="g"
                  icon="fitness_center"
                  color="text-red-600"
                  bgColor="bg-red-50 border-red-200"
                />
                <NutrientCard
                  label="Fett"
                  value={nb.per_serving_fat_g ?? 0}
                  unit="g"
                  icon="water_drop"
                  color="text-amber-600"
                  bgColor="bg-amber-50 border-amber-200"
                />
                <NutrientCard
                  label="Kohlenhydrate"
                  value={nb.per_serving_carbohydrate_g ?? 0}
                  unit="g"
                  icon="grain"
                  color="text-teal-600"
                  bgColor="bg-teal-50 border-teal-200"
                />
              </div>
            </div>

            {/* Macro pie chart */}
            {(nb.per_serving_protein_g || nb.per_serving_fat_g || nb.per_serving_carbohydrate_g) && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Makronährstoff-Verteilung</h3>
                <div className="bg-muted/30 rounded-xl p-4">
                  <Suspense fallback={<div className="h-[260px] bg-muted rounded-xl animate-pulse" />}>
                    <LazyNutritionPieChart
                      proteinG={nb.per_serving_protein_g ?? 0}
                      fatG={nb.per_serving_fat_g ?? 0}
                      carbsG={nb.per_serving_carbohydrate_g ?? 0}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {/* Macro bars (total) */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Gesamtnährwerte</h3>
              <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                <MacroBar
                  label="Protein"
                  value={nb.total_protein_g}
                  max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
                  color="bg-red-500"
                />
                <MacroBar
                  label="Fett"
                  value={nb.total_fat_g}
                  max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
                  color="bg-amber-500"
                />
                <MacroBar
                  label="davon gesättigt"
                  value={nb.total_fat_sat_g}
                  max={nb.total_fat_g || 1}
                  color="bg-amber-300"
                />
                <MacroBar
                  label="Kohlenhydrate"
                  value={nb.total_carbohydrate_g}
                  max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
                  color="bg-teal-500"
                />
                <MacroBar
                  label="davon Zucker"
                  value={nb.total_sugar_g}
                  max={nb.total_carbohydrate_g || 1}
                  color="bg-teal-300"
                />
                <MacroBar
                  label="Ballaststoffe"
                  value={nb.total_fibre_g}
                  max={30}
                  color="bg-green-500"
                />
                <MacroBar
                  label="Salz"
                  value={nb.total_salt_g}
                  max={6}
                  color="bg-blue-500"
                />
              </div>
            </div>

            {/* Contribution panels per parameter (collapsible) */}
            <CollapsibleContributions items={nb.items} />

            {/* Top calorie contributors */}
            {topIngredientsByCalories.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Kalorien nach Zutat</h3>
                <div className="space-y-2">
                  {topIngredientsByCalories.slice(0, 8).map((item) => (
                    <div key={item.recipe_item_id} className="flex items-center gap-3">
                      {item.ingredient_id && ingredientSlugById.get(item.ingredient_id) ? (
                        <EntityLink
                          type="ingredient"
                          slug={ingredientSlugById.get(item.ingredient_id)!}
                          name={item.ingredient_name}
                          variant="muted"
                          className="text-sm font-medium w-32 truncate"
                        />
                      ) : (
                        <span className="text-sm font-medium w-32 truncate">
                          {item.ingredient_name}
                        </span>
                      )}
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{
                            width: `${nb.total_energy_kcal > 0 ? (item.energy_kcal / nb.total_energy_kcal) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {item.energy_kcal.toFixed(0)} kcal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Vitamins section */}
            <MicronutrientSection
              title="Vitamine"
              icon="medication"
              accentColor="text-amber-600"
              nutrients={[
                { label: 'Vitamin C', value: nb.total_vitamin_c_mg, unit: 'mg', dgeKey: 'vitamin_c_mg' },
              ]}
              dgeCoverage={nb.dge_coverage}
              servings={effectiveServings}
            />

            {/* Minerals section removed — no mineral fields tracked */}
          </div>
        </AnalysisSection>
      )}

      {/* --- Gesundheitsanalyse --- */}
      {nutriScore && nb && nb.total_weight_g > 0 && (
        <AnalysisSection
          icon="health_and_safety"
          title="Gesundheitsanalyse"
          accentColor="text-green-600"
        >
          <div className="space-y-6">
            {/* Nutri-Score detail */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                  {['A', 'B', 'C', 'D', 'E'].map((grade) => {
                    const isActive = nutriScore.nutri_label === grade;
                    const colors = NUTRI_SCORE_COLORS[grade];
                    return (
                      <div
                        key={grade}
                        className={`flex items-center justify-center font-bold rounded-lg transition-all ${
                          isActive
                            ? `${colors.bg} ${colors.text} w-14 h-14 text-2xl shadow-lg scale-110`
                            : `${colors.bg}/20 text-muted-foreground w-10 h-10 text-sm opacity-30`
                        }`}
                      >
                        {grade}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gesamtpunkte: {nutriScore.total_points}
                </p>
              </div>
              <div className="flex-1 space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-700">Negative Punkte</span>
                    <span className="text-lg font-bold text-red-700">
                      {nutriScore.negative_points}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Energie, Zucker, gesättigte Fettsäuren, Natrium
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">Positive Punkte</span>
                    <span className="text-lg font-bold text-green-700">
                      {nutriScore.positive_points}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Ballaststoffe, Protein, Obst/Gemüse-Anteil
                  </p>
                </div>
              </div>
            </div>

            {/* Positive health trait badges */}
            {/* <PositiveTraitsBadges traits={nb.positive_traits ?? []} /> */}

            {/* Health indicators */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Gesundheitsindikatoren</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <HealthIndicator
                  label="Zucker"
                  value={nb.total_sugar_g / effectiveServings}
                  max={25}
                  unit="g"
                  goodBelow={10}
                  warnBelow={20}
                />
                <HealthIndicator
                  label="Ges. Fett"
                  value={nb.total_fat_sat_g / effectiveServings}
                  max={20}
                  unit="g"
                  goodBelow={6}
                  warnBelow={13}
                />
                <HealthIndicator
                  label="Salz"
                  value={nb.total_salt_g / effectiveServings}
                  max={6}
                  unit="g"
                  goodBelow={1.5}
                  warnBelow={3}
                />
                <HealthIndicator
                  label="Ballaststoffe"
                  value={nb.total_fibre_g / effectiveServings}
                  max={10}
                  unit="g"
                  goodBelow={999}
                  warnBelow={999}
                  inverted
                />
                <HealthIndicator
                  label="Protein"
                  value={(nb.per_serving_protein_g ?? 0)}
                  max={50}
                  unit="g"
                  goodBelow={999}
                  warnBelow={999}
                  inverted
                />
                <HealthIndicator
                  label="Kalorien"
                  value={(nb.per_serving_energy_kcal ?? 0)}
                  max={800}
                  unit="kcal"
                  goodBelow={400}
                  warnBelow={600}
                />
              </div>
            </div>

            {/* Unified Improvements (Nutri-Score + RecipeHints, top 5) */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Verbesserungsvorschläge</h3>
              <RecipeImprovements recipeId={recipeId} breakdownItems={nb?.items ?? []} totalWeightG={nb.total_weight_g} servings={effectiveServings} />
            </div>
          </div>
        </AnalysisSection>
      )}

      {/* --- Gewichtsanalyse --- */}
      {nb && nb.total_weight_g > 0 && topIngredientsByWeight.length > 0 && (
        <AnalysisSection
          icon="scale"
          title="Gewichtsanalyse"
          accentColor="text-indigo-600"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="material-symbols-outlined text-2xl text-indigo-600">scale</span>
              <div>
                <p className="text-lg font-bold text-indigo-700">
                  {formatWeight(nb.total_weight_g)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Gesamtgewicht ({formatWeight(nb.total_weight_g / effectiveServings)})
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {topIngredientsByWeight.map((item) => (
                <div key={item.recipe_item_id} className="flex items-center gap-3">
                  {item.ingredient_id && ingredientSlugById.get(item.ingredient_id) ? (
                    <EntityLink
                      type="ingredient"
                      slug={ingredientSlugById.get(item.ingredient_id)!}
                      name={item.ingredient_name}
                      variant="muted"
                      className="text-sm font-medium w-32 truncate"
                    />
                  ) : (
                    <span className="text-sm font-medium w-32 truncate">
                      {item.ingredient_name}
                    </span>
                  )}
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${item.weight_pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {formatWeight(item.weight_g)} ({item.weight_pct.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnalysisSection>
      )}

      {/* Recipe Hints + Nutri-Improvements are now rendered inside the
          Nährwert-Analyse section via <RecipeImprovements />. */}

      {/* Emotions — using generic ContentEmotions component */}
      <section className="mt-8 bg-card rounded-xl border p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <span className="material-symbols-outlined text-accent">mood</span>
          Wie findest du dieses Rezept?
        </h2>
        <ContentEmotions
          emotionCounts={recipe.emotion_counts ?? {}}
          userEmotion={recipe.user_emotion ?? null}
          onToggle={(emotionType) => createEmotion.mutate({ emotion_type: emotionType })}
          isPending={createEmotion.isPending}
        />
      </section>

      {/* Similar Recipes */}
      {(recipe.next_best_recipes?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            Ähnliche Rezepte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recipe.next_best_recipes ?? []).map((similar) => (
              <Link
                key={similar.id}
                to={`/recipes/${similar.slug}`}
                className="group block rounded-xl bg-card border overflow-hidden hover:border-rose-500/40 hover:shadow-md transition-all"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={similar.image_url || '/images/inspi_cook.png'}
                    alt={similar.title}
                    loading="lazy"
                    className={`w-full h-full group-hover:scale-105 transition-transform duration-300 ${similar.image_url ? 'object-cover' : 'object-contain p-4 bg-muted/30'}`}
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm group-hover:text-rose-600 transition-colors line-clamp-2">
                    {similar.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {similar.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      {RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === similar.execution_time)
                        ?.label ?? similar.execution_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        signal_cellular_alt
                      </span>
                      {RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === similar.difficulty)
                        ?.label ?? similar.difficulty}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ContentLinkSection contentType="recipe" objectId={recipeId} />

      {/* Author Section */}
      <ContentAuthorSection
        authors={recipe.authors ?? []}
        createdAt={recipe.created_at}
        className="mt-8"
      />

      {/* Comments — using generic ContentComments component */}
      <section className="mt-8 bg-card rounded-xl border p-6">
        <ContentComments
          comments={comments ?? []}
          onSubmit={(data) => createComment.mutate(data)}
          isPending={createComment.isPending}
        />
      </section>
      </main>

      {/* Desktop Sidebar */}
      <RecipeSidebar
        recipe={recipe}
        recipeId={recipeId}
        servings={servingsMultiplier}
        onServingsChange={setServingsMultiplier}
        onOpenShoppingList={handleOpenShoppingList}
      />

      {/* Mobile Action Bar */}
      {currentUser && (
        <RecipeMobileActionBar
          onOpenShoppingList={handleOpenShoppingList}
          onOpenPortions={() => setPortionSheetOpen(true)}
        />
      )}

      {/* Portion Bottom Sheet (Mobile) */}
      <PortionBottomSheet
        open={portionSheetOpen}
        onOpenChange={setPortionSheetOpen}
        servings={servingsMultiplier}
        onServingsChange={setServingsMultiplier}
      />
    </article>
    </EntityLinkContext.Provider>
  );
}

// --- Helper Components ---

function NutrientCard({
  label,
  value,
  unit,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`text-center p-4 rounded-xl border ${bgColor}`}>
      <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
      <p className="text-xl font-extrabold mt-1">
        {value.toFixed(unit === 'kcal' ? 0 : 1)}
      </p>
      <p className="text-xs text-muted-foreground">
        {label} ({unit})
      </p>
    </div>
  );
}

function HealthIndicator({
  label,
  value,
  max,
  unit,
  goodBelow,
  warnBelow,
  inverted = false,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  goodBelow: number;
  warnBelow: number;
  inverted?: boolean;
}) {
  let status: 'good' | 'warn' | 'bad';
  if (inverted) {
    // Higher is better (fiber, protein)
    status = value >= goodBelow ? 'good' : value >= warnBelow ? 'warn' : 'good';
  } else {
    status = value <= goodBelow ? 'good' : value <= warnBelow ? 'warn' : 'bad';
  }

  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warn: 'bg-amber-50 border-amber-200 text-amber-700',
    bad: 'bg-red-50 border-red-200 text-red-700',
  };

  const statusIcons = {
    good: 'check_circle',
    warn: 'warning',
    bad: 'error',
  };

  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const dgePct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className={`p-3 rounded-xl border ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <span className="material-symbols-outlined text-[16px]">{statusIcons[status]}</span>
      </div>
      <p className="text-lg font-bold">
        {value.toFixed(1)} {unit}
      </p>
      <p className="text-[10px] opacity-75">{dgePct}% der DGE-Referenz</p>
      <div className="h-1.5 bg-white/50 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full rounded-full ${status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PriceRow({
  item,
  totalPrice,
  ingredientSlugById,
}: {
  item: RecipeItemNutrition;
  totalPrice: number;
  ingredientSlugById: Map<number, string>;
}) {
  const pricePct = totalPrice > 0 && item.price_eur ? (item.price_eur / totalPrice) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {item.ingredient_id && ingredientSlugById.get(item.ingredient_id) ? (
        <EntityLink
          type="ingredient"
          slug={ingredientSlugById.get(item.ingredient_id)!}
          name={item.ingredient_name}
          variant="muted"
          className="text-sm font-medium w-32 truncate"
        />
      ) : (
        <span className="text-sm font-medium w-32 truncate">{item.ingredient_name}</span>
      )}
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full"
          style={{ width: `${pricePct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-yellow-700 w-16 text-right">
        {item.price_eur?.toFixed(2)} EUR
      </span>
    </div>
  );
}
