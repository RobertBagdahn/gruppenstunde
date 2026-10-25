import { PageSkeleton } from '@/components/ui/skeleton';
import NotFoundState from '@/components/shared/NotFoundState';
import SectionBoundary from '@/components/shared/SectionBoundary';
import { useState, useEffect, useMemo } from 'react';
import { CalendarPlus, Sparkles, Smile, GitFork, UtensilsCrossed, Printer, Pencil, Trash2, AlertTriangle, Minus, Plus, Clock, BarChart2, Users, BadgeCheck, Link2 } from 'lucide-react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EntityLink } from '@/components/shared/EntityLink';
import { PdfExportDialog } from '@/components/PdfExportDialog';
import { API_BASE_URL, ApiError } from '@/lib/api';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { Button } from '@/components/ui/button';
import { useBlocker } from '@/hooks/useBlocker';
import RecipePurchaseDialog from '@/components/shopping/RecipePurchaseDialog';
import { useCurrentUser } from '@/api/auth';
import { useAvailableConversions } from '@/api/unitConversions';
import {
  useRecipeBySlug,
  useRecipeComments,
  useCreateRecipeComment,
  useRecipeEmotion,
  useRecipeNutriScore,
  useRecipeNutritionBreakdown,
  useUpdateRecipe,
  useDeleteRecipe,
  useRecipeUsage,
  useForkRecipe,
  useForkAndSaveRecipe,
  useUpdateVisibility,
  useUploadRecipeImage,
  useDeleteRecipeImage,
  useSetRecipeImageFromUrl,
  useRecipes,
} from '@/api/recipes';
import { formatEuro, formatWeight } from '@/lib/format';
import {
  RECIPE_DIFFICULTY_OPTIONS,
  getRecipeExecutionTimeLabel,
} from '@/schemas/recipe';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorDisplay from '@/components/ErrorDisplay';
import ContentComments from '@/components/content/ContentComments';
import ContentEmotions from '@/components/content/ContentEmotions';
import InlineEditor from '@/components/content/InlineEditor';
import TitleImageEditor from '@/components/content/TitleImageEditor';
import IngredientList from '@/components/supply/IngredientList';
import RecipeMaterialsSection from '@/components/recipe/RecipeMaterialsSection';
import InlineIngredientEditor from '@/components/recipe/InlineIngredientEditor';
import RecipeServingContextSelector from '@/components/recipe/RecipeServingContextSelector';
import { ContentLinkSection } from '@/components/content/ContentLinkSection';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import RecipeRulesBox from '@/components/recipe/RecipeRulesBox';

import RecipeMetaCard from '@/components/recipe/RecipeMetaCard';
import RecipeSidebar from '@/components/recipe/RecipeSidebar';
import RecipeMobileActionBar from '@/components/recipe/RecipeMobileActionBar';
import RecipeUsageInMealPlans from '@/components/recipe/RecipeUsageInMealPlans';
import RecipeDeleteUsageNotice from '@/components/recipe/RecipeDeleteUsageNotice';
import RecipeCookingMode from '@/pages/recipes/RecipeCookingMode';
import StepEditor from '@/components/recipe/StepEditor';
import RecipeStepsReadOnly from '@/components/recipe/RecipeStepsReadOnly';
import { parsePreparationSteps } from '@/lib/parseRecipeSteps';
import PortionBottomSheet from '@/components/recipe/PortionBottomSheet';
import ScaleIngredientsDialog from '@/components/recipe/ScaleIngredientsDialog';
import { useRecipeModificationStore } from '@/store/useRecipeModificationStore';
import { notify } from '@/lib/notify';
import { useRequireLogin } from '@/hooks/useRequireLogin';
import AddRecipeToMealPlanDialog from '@/components/recipe/AddRecipeToMealPlanDialog';
import { usePageMeta } from '@/hooks/usePageMeta';
import { buildBreadcrumbJsonLd } from '@/lib/seo/buildBreadcrumbJsonLd';
import { buildRecipeJsonLd } from '@/lib/seo/buildRecipeJsonLd';
import { RecipeAnalysisTabs } from '@/components/recipe/RecipeAnalysisTabs';
import { PriceTab } from '@/components/recipe/PriceTab';
import { NutritionTab } from '@/components/recipe/NutritionTab';
import { HealthTab } from '@/components/recipe/HealthTab';
import { WeightTab } from '@/components/recipe/WeightTab';
import { Icon } from '@/components/ui/icon';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import RecipeTypeTag from '@/components/recipe/RecipeTypeTag';
import RecipeKeyFigures from '@/components/recipe/RecipeKeyFigures';

// --- Collapsible Section Component ---
function AnalysisSection({
  icon,
  title,
  defaultOpen = false,
  children,
  preview,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Kept for call sites; section icons share the calm primary tile (Feldküche). */
  accentColor?: string;
  preview?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-card rounded-xl shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 text-left transition-colors hover:bg-secondary"
      >
        <h2 className="flex shrink-0 items-center gap-3 font-display text-emphasis sm:text-section font-extrabold text-foreground">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon name={icon} size={20} />
          </span>
          {title}
        </h2>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {preview && <div className="min-w-0 whitespace-nowrap text-right [&>*]:whitespace-nowrap">{preview}</div>}
          <Icon name="expand_more" size={24} className={`text-muted-foreground transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && <div className="animate-in fade-in-0 slide-in-from-top-1 duration-300 px-4 pb-6 sm:px-6">{children}</div>}
    </section>
  );
}



/** Missing recipe (food-page-states): explanation, "Meintest du …" from the existing search, a way back. */
function RecipeNotFound({ slug }: { slug: string }) {
  const suggestions = useRecipes({ q: slug.replace(/-/g, ' '), page_size: 3 });
  const items = suggestions.data?.items ?? [];
  return (
    <div className="px-4 py-8">
      <NotFoundState
        title="Rezept nicht gefunden"
        description="Vielleicht wurde es umbenannt oder gelöscht. Such einfach nach einem ähnlichen Rezept."
        suggestions={
          items.length > 0 ? (
            <div>
              <p className="mb-2 text-body font-semibold text-foreground">Meintest du …</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link to={`/recipes/${item.slug}`} className="block rounded-lg bg-card p-3 shadow-card hover:bg-primary-soft">
                      <span className="block font-semibold text-foreground">{item.title}</span>
                      <span className="text-caption text-muted-foreground">
                        {getRecipeExecutionTimeLabel(item.execution_time) ?? ''}
                        {item.costs_per_person != null ? ` · ${formatEuro(item.costs_per_person)} pro Portion` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : undefined
        }
        listLink={{ label: 'Alle Rezepte ansehen', to: '/recipes' }}
      />
    </div>
  );
}

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [mealPlanDialogOpen, setMealPlanDialogOpen] = useState(false);
  const { guard: requireLogin } = useRequireLogin();
  const openMealPlanDialog = () => requireLogin(() => setMealPlanDialogOpen(true), { reason: 'Melde dich an, um Rezepte in deine Essenspläne zu legen.' });

  const { data: recipe, isLoading, error, refetch } = useRecipeBySlug(slug ?? '');
  const recipeId = recipe?.id ?? 0;
  const legacyPreparationSteps = useMemo(
    () => parsePreparationSteps(recipe?.description ?? ''),
    [recipe?.description],
  );

  const canCook =
    (recipe?.steps_count ?? 0) > 0 ||
    (recipe?.steps.length ?? 0) > 0 ||
    legacyPreparationSteps.length > 0;

  const { data: comments } = useRecipeComments(recipeId);
  const createComment = useCreateRecipeComment(recipeId);
  const createEmotion = useRecipeEmotion(recipeId);
  const updateRecipe = useUpdateRecipe(recipeId);
  const deleteRecipe = useDeleteRecipe();
  const { data: nutriScore } = useRecipeNutriScore(recipeId);
  const { data: nutritionBreakdown } = useRecipeNutritionBreakdown(recipeId, 25, 'male');
  const forkRecipe = useForkRecipe(recipeId);
  const forkAndSaveRecipe = useForkAndSaveRecipe(recipeId);
  const updateVisibility = useUpdateVisibility(recipeId);
  const uploadImage = useUploadRecipeImage(recipeId);
  const deleteImage = useDeleteRecipeImage(recipeId);
  const setImageFromUrl = useSetRecipeImageFromUrl(recipeId);

  const [portionsMultiplier, setPortionsMultiplier] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data: recipeUsage } = useRecipeUsage(recipeId, { enabled: showDeleteConfirm });
  const deleteBlockedByUsage = (recipeUsage?.plan_count ?? 0) > 0;
  const [showShoppingExport, setShowShoppingExport] = useState(false);
  const [exportPortions, setExportPortions] = useState(1);
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState<string | null>(null);
  const [portionSheetOpen, setPortionSheetOpen] = useState(false);
  const [isInlineEditMode, setIsInlineEditMode] = useState(
    searchParams.get('edit') === 'ingredients',
  );
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);

  // This is a transient input context. It is intentionally reset whenever the
  // ingredient editor is opened again and is never read from the recipe.
  // Opening via ?edit=ingredients starts at 1 portion, so no confirmation is needed.
  const [editInputPortions, setEditInputPortions] = useState<number | null>(
    searchParams.get('edit') === 'ingredients' ? 1 : null,
  );
  const [editInputPortionsDraft, setEditInputPortionsDraft] = useState(1);

  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneTitle, setCloneTitle] = useState('');

  const { data: currentUser } = useCurrentUser();

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
  const modifiedPortions = useRecipeModificationStore((s) => s.modifiedPortions);
  const initializeModifications = useRecipeModificationStore((s) => s.initialize);
  const resetModifications = useRecipeModificationStore((s) => s.reset);
  const scaleToNormPortion = useRecipeModificationStore((s) => s.scaleToNormPortion);
  const scaleByFactor = useRecipeModificationStore((s) => s.scaleByFactor);

  // Initialize modification store when nutrition breakdown data loads
  useEffect(() => {
    if (nutritionBreakdown && recipe && !isDirty) {
      // Recipe quantities are stored per person.
      initializeModifications(nutritionBreakdown.items, 1);
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

  // Same title, description and crumbs as the visible page (food-seo-markup).
  usePageMeta({
    title: recipe?.title,
    description: recipe?.summary || undefined,
    image: recipe?.image_url,
    jsonLd:
      recipe && slug
        ? [
            buildRecipeJsonLd(recipe, window.location.origin, `/recipes/${slug}`),
            buildBreadcrumbJsonLd(
              [{ name: 'Startseite', path: '/' }, { name: 'Rezepte', path: '/recipes' }, { name: recipe.title }],
              window.location.origin,
            ),
          ]
        : null,
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
    const totalEnergyKcal = items.reduce((s, i) => s + i.energy_kcal, 0);
    const totalProteinG = items.reduce((s, i) => s + i.protein_g, 0);
    const totalFatG = items.reduce((s, i) => s + i.fat_g, 0);
    const totalFatSatG = items.reduce((s, i) => s + i.fat_sat_g, 0);
    const totalCarbohydrateG = items.reduce((s, i) => s + i.carbohydrate_g, 0);
    const totalSugarG = items.reduce((s, i) => s + i.sugar_g, 0);
    const totalFibreG = items.reduce((s, i) => s + i.fibre_g, 0);
    const totalSaltG = items.reduce((s, i) => s + i.salt_g, 0);

    // Recompute weight_pct
    const itemsWithPct = items.map((i) => ({
      ...i,
      weight_pct: totalWeightG > 0 ? (i.weight_g / totalWeightG) * 100 : 0,
    }));

    return {
      total_weight_g: totalWeightG,
      total_price_eur: totalPriceEur,
      total_energy_kcal: totalEnergyKcal,
      total_protein_g: totalProteinG,
      total_fat_g: totalFatG,
      total_fat_sat_g: totalFatSatG,
      total_carbohydrate_g: totalCarbohydrateG,
      total_sugar_g: totalSugarG,
      total_fibre_g: totalFibreG,
      total_salt_g: totalSaltG,
      // Micronutrient totals (from modified items)
      total_vitamin_c_mg: items.reduce((s, i) => s + (i.vitamin_c_mg ?? 0), 0),
      per_serving_energy_kcal: totalEnergyKcal,
      per_serving_protein_g: totalProteinG,
      per_serving_fat_g: totalFatG,
      per_serving_carbohydrate_g: totalCarbohydrateG,
      per_100g_energy_kcal: totalWeightG > 0 ? totalEnergyKcal / totalWeightG * 100 : null,
      per_100g_protein_g: totalWeightG > 0 ? totalProteinG / totalWeightG * 100 : null,
      per_100g_fat_g: totalWeightG > 0 ? totalFatG / totalWeightG * 100 : null,
      per_100g_fat_sat_g: totalWeightG > 0 ? totalFatSatG / totalWeightG * 100 : null,
      per_100g_carbohydrate_g: totalWeightG > 0 ? totalCarbohydrateG / totalWeightG * 100 : null,
      per_100g_sugar_g: totalWeightG > 0 ? totalSugarG / totalWeightG * 100 : null,
      per_100g_fibre_g: totalWeightG > 0 ? totalFibreG / totalWeightG * 100 : null,
      per_100g_salt_g: totalWeightG > 0 ? totalSaltG / totalWeightG * 100 : null,
      per_100g_vitamin_c_mg: totalWeightG > 0 && items.some((i) => i.vitamin_c_mg != null)
        ? items.reduce((s, i) => s + (i.vitamin_c_mg ?? 0), 0) / totalWeightG * 100
        : null,
      positive_traits: nutritionBreakdown.positive_traits ?? [],
      // Proportionally rescale DGE coverage when totals change
      dge_coverage: (() => {
        const origTotal = nutritionBreakdown.total_energy_kcal;
        if (!origTotal || !totalEnergyKcal) return nutritionBreakdown.dge_coverage ?? {};
        const scale = totalEnergyKcal / origTotal;
        const orig = nutritionBreakdown.dge_coverage ?? {};
        return Object.fromEntries(
          Object.entries(orig).map(([k, v]) => [k, typeof v === 'number' ? v * scale : v])
        );
      })(),
      dge_reference: nutritionBreakdown.dge_reference ?? {},
      items: itemsWithPct,
    };
  }, [nutritionBreakdown, isDirty, modifiedItems]);
  const topIngredientsByWeight = nb
    ? [...nb.items].sort((a, b) => b.weight_g - a.weight_g)
    : [];
  const topIngredientsByPrice = nb
    ? [...nb.items].filter((i) => i.price_eur !== null).sort((a, b) => (b.price_eur ?? 0) - (a.price_eur ?? 0))
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
      <PageSkeleton label="Rezept wird geladen" />
    );
  }

  if (error || !recipe) {
    const notFound = !error || (error instanceof ApiError && error.status === 404);
    if (notFound) return <RecipeNotFound slug={slug ?? ''} />;
    return (
      <div className="container py-8">
        <ErrorDisplay error={error} onRetry={() => refetch()} onBack={() => navigate(-1)} backLabel="Zurück" />
      </div>
    );
  }

  // Cooking Mode — render fullscreen overlay, skip everything else
  if (mode === 'cooking') {
    return (
      <RecipeCookingMode
        recipe={recipe}
        portionsMultiplier={portionsMultiplier}
        onPortionsChange={setPortionsMultiplier}
      />
    );
  }


  const timeLabel = getRecipeExecutionTimeLabel(recipe.execution_time);
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty ?? null;
  const scoutLevelsLabel =
    recipe.scout_levels.length > 0 ? recipe.scout_levels.map((l) => l.name).join(', ') : 'Für alle';
  const authorLabel =
    recipe.authors && recipe.authors.length > 0
      ? recipe.authors.map((a) => a.display_name || a.scout_name).join(', ')
      : null;
  const createdAtLabel = recipe.created_at
    ? new Date(recipe.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Group tags by parent
  const topicTags = recipe.tags.filter((t) => t.parent_name === 'Themen');

  // Reusable handler to open the shopping list export dialog
  const handleOpenShoppingList = () => {
    setExportPortions(portionsMultiplier);
    setShowShoppingExport(true);
  };

  // Backend always stores portions=1 (normalized)
  const basePortions = 1;
  const displayedPortions = isDirty ? (modifiedPortions ?? basePortions) : portionsMultiplier;
  const displayedPriceTotal = nb?.total_price_eur != null
    ? nb.total_price_eur * (isDirty ? 1 : portionsMultiplier)
    : null;
  const displayedPricePerPortion = displayedPriceTotal != null && displayedPortions > 0
    ? displayedPriceTotal / displayedPortions
    : null;

  return (
    <EntityLinkContext.Provider value="detail">
    <article className="mx-auto max-w-7xl px-4 pb-36 sm:px-6 lg:px-8 lg:pb-8">
      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteRecipe.mutate(recipeId, {
            onSuccess: () => {
              notify.success('Rezept gelöscht');
              setShowDeleteConfirm(false);
              navigate('/recipes');
            },
            onError: (err) => {
              notify.error('Rezept konnte nicht gelöscht werden', { error: err });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Rezept löschen?"
        description="Das Rezept wird gelöscht und ist nicht mehr sichtbar."
        confirmLabel="Löschen"
        loading={deleteRecipe.isPending}
        confirmDisabled={deleteBlockedByUsage}
      >
        <RecipeDeleteUsageNotice usage={recipeUsage} />
      </ConfirmDialog>

      {/* Leave Confirmation when modifications present (10.6) */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        title="Änderungen verwerfen?"
        description="Du hast das Rezept modifiziert. Wenn du die Seite verlässt, gehen alle Änderungen verloren."
        confirmLabel="Verwerfen"
      />

      {/* Header on the white ground: breadcrumbs, title, type and facts, actions, image when there is one (food-page-shell, recipe-detail-reorganized) */}
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Breadcrumbs
            items={[
              { label: 'Startseite', to: '/' },
              { label: 'Rezepte', to: '/recipes' },
              { label: recipe.title },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <RecipeTypeTag type={recipe.recipe_type} />
            {recipe.recipe_badge === 'verified' && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success-soft px-3 text-body font-semibold text-success">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Inspi-verifiziert
              </span>
            )}
            {(recipe.nutritional_tags ?? []).map((nt) => (
              <span
                key={nt.id}
                className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-body font-semibold text-foreground"
              >
                {nt.name}
              </span>
            ))}
          </div>
          <h1 className="font-display text-title font-extrabold text-foreground [overflow-wrap:anywhere]">{recipe.title}</h1>
          {recipe.summary && <p className="max-w-2xl text-emphasis text-muted-foreground">{recipe.summary}</p>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body text-muted-foreground">
            {timeLabel && (
              <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden="true" />{timeLabel}</span>
            )}
            {difficultyLabel && (
              <span className="inline-flex items-center gap-2"><BarChart2 className="h-4 w-4" aria-hidden="true" />{difficultyLabel}</span>
            )}
            <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" aria-hidden="true" />{scoutLevelsLabel}</span>
            {authorLabel && (
              <span>von <span className="font-semibold text-foreground">{authorLabel}</span>{createdAtLabel && <> · {createdAtLabel}</>}</span>
            )}
          </div>

          {(recipe.source_url || recipe.forked_from_title) && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-body text-muted-foreground">
              {recipe.source_url && (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary-dark underline-offset-4 hover:underline"
                >
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  Originalrezept
                </a>
              )}
              {recipe.forked_from_title && (
                <span className="inline-flex items-center gap-1.5">
                  <GitFork className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Basiert auf{' '}
                  {recipe.forked_from_slug ? (
                    <Link to={`/recipes/${recipe.forked_from_slug}`} className="font-semibold text-primary-dark underline underline-offset-4">
                      {recipe.forked_from_title}
                    </Link>
                  ) : (
                    recipe.forked_from_title
                  )}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1" data-testid="recipe-detail-actions">
            <button
              type="button"
              onClick={openMealPlanDialog}
              className="press inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-body font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Zum Essensplan
            </button>
            {recipe.can_edit && (
              <Link
                to={`/recipes/${recipe.slug}/edit`}
                className="press inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-body font-semibold text-foreground transition-colors hover:bg-muted"
                aria-label="Bearbeiten"
              >
                <Pencil className="h-4 w-4" />
                Bearbeiten
              </Link>
            )}
            <button
              type="button"
              onClick={() => setPdfDialogOpen(true)}
              className="press inline-flex h-11 items-center gap-2 rounded-lg bg-primary-soft px-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/70"
              title="Als PDF öffnen"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Drucken
            </button>
            {recipe.can_delete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="press flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-danger transition-colors hover:bg-danger-soft"
                title="Rezept löschen"
                aria-label="Löschen"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {(recipe.image_url || recipe.can_edit) && (
          <div className="w-full">
            <TitleImageEditor
              contentType="recipe"
              imageUrl={recipe.image_url}
              canEdit={recipe.can_edit}
              title={recipe.title}
              summary={recipe.summary}
              uploadMutation={uploadImage}
              deleteMutation={deleteImage}
              setFromUrlMutation={setImageFromUrl}
            />
          </div>
        )}
      </header>

      <div className="space-y-6">
      <RecipeKeyFigures
        totalPriceEur={displayedPriceTotal}
        pricePerPortionEur={displayedPricePerPortion}
        portions={displayedPortions}
        nutriClass={recipe.cached_nutri_class}
        energyPerPortionKcal={nb ? nb.total_energy_kcal : null}
        weightPerPortionG={nb ? nb.total_weight_g : null}
        views={recipe.view_count}
        likes={recipe.like_score}
      />

      {/* Modification Indicator (10.5) + Save Buttons */}
      {isDirty && (
        <div className="animate-rise rounded-xl border-2 border-warning-border bg-warning-soft p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Icon name="edit_note" size={24} className="text-warning" />
              <span className="text-body font-medium text-warning">Rezept modifiziert</span>
            </div>
            <button
              type="button"
              onClick={resetModifications}
              className="text-caption font-medium text-warning hover:text-warning underline"
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
                  const itemsPayload = modifiedItems
                    .map((mod) => {
                      const orig = recipe.recipe_items?.find((ri) => ri.id === mod.recipe_item_id);
                      // Filter: skip items without valid portion_id
                      if (!orig?.portion_id) {
                        return null;
                      }
                      return {
                        portion_id: orig.portion_id,
                        ingredient_id: mod.ingredient_id,
                        quantity: mod.quantity,
                        measuring_unit_id: orig.measuring_unit_id ?? null,
                        sort_order: orig.sort_order ?? 0,
                        note: orig.note ?? '',
                        is_optional: orig.is_optional,
                      };
                    })
                    .filter((item) => item !== null);
                  forkAndSaveRecipe.mutate(
                    { portions: 1, recipe_items: itemsPayload },
                    {
                      onSuccess: (savedRecipe) => {
                        resetModifications();
                        notify.success('Neue Version gespeichert');
                        navigate(`/recipes/${savedRecipe.slug}`);
                      },
                      onError: (err) => {
                        notify.error('Neue Version konnte nicht gespeichert werden', { error: err });
                      },
                    },
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Icon name="content_copy" size={20} />
                {forkAndSaveRecipe.isPending ? 'Wird gespeichert...' : 'Als neue Version speichern'}
              </button>
            )}

            {/* Update current recipe — only for owner/admin */}
            {recipe.can_edit && (
              <button
                type="button"
                 disabled={updateRecipe.isPending}
                 onClick={() => {
                   const itemsPayload = modifiedItems
                     .map((mod) => {
                       const orig = recipe.recipe_items?.find((ri) => ri.id === mod.recipe_item_id);
                       // Filter: skip items without valid portion_id
                       if (!orig?.portion_id) {
                         return null;
                       }
                        return {
                          portion_id: orig.portion_id,
                          ingredient_id: mod.ingredient_id,
                          quantity: mod.quantity,
                          measuring_unit_id: orig.measuring_unit_id ?? null,
                          sort_order: orig.sort_order ?? 0,
                          note: orig.note ?? '',
                          is_optional: orig.is_optional,
                        };
                      })
                      .filter((item) => item !== null);
                    updateRecipe.mutate(
                     {
                       // Always save as portions=1 (normalized)
                       portions: 1,
                       recipe_items: itemsPayload,
                     },
                    {
                      onSuccess: () => {
                        resetModifications();
                        notify.success('Rezept aktualisiert');
                      },
                      onError: (err) => {
                        notify.error('Rezept konnte nicht aktualisiert werden', { error: err });
                      },
                    },
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Icon name="save" size={20} />
                {updateRecipe.isPending ? 'Wird gespeichert...' : 'Rezept aktualisieren'}
              </button>
            )}
          </div>

          <div className="border-t border-warning-border pt-3">
            <button
              type="button"
              onClick={() => setScaleDialogOpen(true)}
              className="flex items-center gap-1.5 text-caption font-medium text-warning hover:text-warning transition-colors"
            >
              <Icon name="scale" size={16} />
              Zutaten skalieren
            </button>
          </div>
        </div>
      )}

      {/* Scale Ingredients Dialog */}
      <ScaleIngredientsDialog
        open={scaleDialogOpen}
        onOpenChange={setScaleDialogOpen}
        onScale={(factor) => scaleByFactor(factor)}
      />

      {/* Portion Normalization Hint (10.4) */}
      {nb && (() => {
        // DGE reference: 15yo male, PAL 1.5 = 2868 kcal daily (approx. 12000 kJ)
        const dailyEnergyKcal = 2868;
        const mealFractions: Record<string, number> = {
          breakfast: 0.25, warm_meal: 0.35, cold_meal: 0.25,
          dessert: 0.10, recipe_part: 0.10, drink: 0.05, snack: 0.10, ingredient: 0.05,
        };
        const fraction = mealFractions[recipe.recipe_type] ?? 0.30;
        const expectedEnergyKcal = dailyEnergyKcal * fraction;
        const perServingEnergyKcal = nb.total_energy_kcal;
        const ratio = perServingEnergyKcal / expectedEnergyKcal;

        if (ratio > 1.5) {
          const normFactor = expectedEnergyKcal / perServingEnergyKcal;
          return (
            <div role="status" className="animate-rise flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-warning-soft p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-warning">
                  <Icon name="warning" size={20} />
                </span>
                <div>
                  <p className="text-body font-bold text-warning">
                    Diese Portion ist größer als eine Normportion
                  </p>
                  <p className="text-caption text-warning mt-0.5">
                    Energie pro Portion: {Math.round(perServingEnergyKcal)} kcal (Referenz: {Math.round(expectedEnergyKcal)} kcal)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => scaleToNormPortion(normFactor)}
                className="press shrink-0 inline-flex h-11 items-center gap-2 rounded-lg bg-card px-4 text-body font-bold text-warning shadow-soft transition-colors hover:bg-warning-soft"
              >
                <Icon name="scale" size={16} />
                Auf Normportion skalieren
              </button>
            </div>
          );
        }
        return null;
      })()}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
      <div className="stagger min-w-0 space-y-6">



      {/* Topic Tags */}
      {topicTags.length > 0 && (
        <section className="bg-card rounded-xl p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-body font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <Icon name="label" size={20} />
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

      {/* Recipe Items (Ingredients) — using IngredientList component */}
      <section className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-title font-extrabold leading-tight">Zutaten</h2>
              {!isInlineEditMode && (
                isDirty ? (
                  <p className="text-body text-muted-foreground leading-tight mt-0.5">
                    {`für ${displayedPortions} ${displayedPortions === 1 ? 'Portion' : 'Portionen'}`}
                  </p>
                ) : (
                  // View-only scaling: changes the displayed amounts, never the stored recipe.
                  <div className="mt-1 flex items-center gap-1.5 text-body text-muted-foreground">
                    <span>für</span>
                    <div className="inline-flex items-center gap-1 rounded-full bg-muted p-0.5">
                      <button
                        type="button"
                        onClick={() => setPortionsMultiplier(Math.max(1, portionsMultiplier - 1))}
                        disabled={portionsMultiplier <= 1}
                        className="press flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-full bg-card text-foreground shadow-soft hover:text-primary disabled:opacity-40"
                        aria-label="Portion verringern"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span key={portionsMultiplier} className="animate-pop min-w-[1.75rem] text-center font-display text-emphasis font-extrabold tabular-nums text-foreground" aria-live="polite">
                        {portionsMultiplier}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPortionsMultiplier(Math.min(100, portionsMultiplier + 1))}
                        disabled={portionsMultiplier >= 100}
                        className="press flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-full bg-card text-foreground shadow-soft hover:text-primary disabled:opacity-40"
                        aria-label="Portion erhöhen"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span>{portionsMultiplier === 1 ? 'Portion' : 'Portionen'}</span>
                  </div>
                )
              )}
            </div>
          </div>
          {!isInlineEditMode && recipe.can_edit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
           onClick={() => {
             // Only ask for the serving context when the user scaled away from 1 portion.
             setEditInputPortionsDraft(displayedPortions);
             setEditInputPortions(displayedPortions === 1 ? 1 : null);
             setIsInlineEditMode(true);
           }}
              title="Zutaten bearbeiten"
              data-testid="ingredients-edit-trigger"
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              Bearbeiten
            </Button>
          )}
        </div>

        {isInlineEditMode ? (
          editInputPortions === null ? (
            <RecipeServingContextSelector
              value={editInputPortionsDraft}
              onChange={setEditInputPortionsDraft}
              onConfirm={() => setEditInputPortions(editInputPortionsDraft)}
              description="Wähle zuerst den Kontext für die Gesamtmengen. Danach bleibt die Personenzahl für diese Bearbeitung gesperrt."
            />
          ) : (
            <InlineIngredientEditor
              recipeId={recipe.id}
              recipeSlug={recipe.slug}
              items={recipe.recipe_items ?? []}
              portions={recipe.portions}
              inputPortions={editInputPortions}
              onClose={() => {
                setEditInputPortions(null);
                setIsInlineEditMode(false);
                const next = new URLSearchParams(searchParams);
                next.delete('edit');
                setSearchParams(next, { replace: true });
              }}
              onSaved={() => {
                setEditInputPortions(null);
                setIsInlineEditMode(false);
                refetch();
                const next = new URLSearchParams(searchParams);
                next.delete('edit');
                setSearchParams(next, { replace: true });
              }}
            />
          )
        ) : (
          <IngredientList
            items={isDirty
              ? (recipe.recipe_items ?? []).map((item) => {
                  const mod = modifiedItems.find((m) => m.recipe_item_id === item.id);
                  return mod ? { ...item, quantity: mod.quantity } : item;
                })
              : (recipe.recipe_items ?? [])}
            portions={isDirty ? (modifiedPortions ?? 1) : 1}
            portionsMultiplier={isDirty ? 1 : portionsMultiplier}
            availableConversions={availableConversions?.items}
            showSearch={false}
            showQuantityOutliers={recipe.can_edit}
          />
        )}
        {!isInlineEditMode && (recipe.recipe_items ?? []).length > 0 && (
          <p className="mt-4 flex flex-wrap justify-end gap-x-2 text-body text-muted-foreground tabular-nums">
            <span>{(recipe.recipe_items ?? []).length} {(recipe.recipe_items ?? []).length === 1 ? 'Zutat' : 'Zutaten'}</span>
            {nb && nb.total_weight_g > 0 && (
              <span>· {formatWeight(nb.total_weight_g * (isDirty ? 1 : portionsMultiplier))}</span>
            )}
            {displayedPriceTotal != null && <span className="font-semibold text-foreground">· {formatEuro(displayedPriceTotal)}</span>}
          </p>
        )}
      </section>

      {/* Recipe Materials: devices and consumables, scaled to the selected servings */}
      <RecipeMaterialsSection
        recipeId={recipe.id}
        materials={recipe.materials ?? []}
        servings={displayedPortions}
        canEdit={recipe.can_edit}
        onEdit={() => navigate(`/recipes/${recipe.slug}/edit`)}
      />

      {/* Shopping: a new trip or an existing list */}
      <RecipePurchaseDialog
        open={showShoppingExport}
        onOpenChange={setShowShoppingExport}
        recipe={{ id: recipe.id, title: recipe.title, hasConsumables: (recipe.materials ?? []).some((m) => m.is_consumable) }}
        defaultPortions={exportPortions}
        onDone={(list) => navigate(`/shopping-lists/${list.id}`)}
      />

      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={(open) => { if (!open) setShowCloneDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emphasis">
              <Icon name="content_copy" size={24} className="text-primary" />
              Rezept clonen
            </DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              Erstelle eine persönliche Kopie dieses Rezepts. Du kannst sie danach frei bearbeiten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block text-body font-medium">Name für die Kopie</label>
            <input
              type="text"
              value={cloneTitle}
              onChange={(e) => setCloneTitle(e.target.value)}
              placeholder="Name des Rezepts"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-body focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCloneDialog(false)}
              className="px-4 py-2 border rounded-lg text-body hover:bg-muted transition"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={!cloneTitle.trim() || forkRecipe.isPending}
              onClick={() => {
                forkRecipe.mutate(
                  { title: cloneTitle.trim() },
                  {
                    onSuccess: (forkedRecipe) => {
                      setShowCloneDialog(false);
                      notify.success('Rezept geklont');
                      navigate(`/recipes/${forkedRecipe.slug}`);
                    },
                    onError: (err) => {
                      notify.error('Rezept konnte nicht geklont werden', { error: err });
                    },
                  },
                );
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-body font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {forkRecipe.isPending ? (
                <>
                  <Icon name="progress_activity" size={20} className="animate-spin" />
                  Wird geklont...
                </>
              ) : (
                'Rezept clonen'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visibility UI for recipe owner (13.6) */}
      {recipe.is_owner && recipe.visibility && (
        <div className="bg-card rounded-xl p-5 shadow-card">
          <h3 className="flex items-center gap-2 text-body font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            <Icon name="visibility" size={20} />
            Sichtbarkeit
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <select
              value={recipe.visibility}
              onChange={(e) => setShowVisibilityConfirm(e.target.value)}
              className="w-full sm:w-auto rounded-lg border bg-background px-3 py-2 text-body"
            >
              <option value="private">Privat – nur für mich</option>
              <option value="group">Gruppe – für meine Gruppe</option>
              <option
                value="public"
                disabled={recipe.status === 'draft' && (recipe.recipe_items?.length ?? 0) === 0}
                title={recipe.status === 'draft' && (recipe.recipe_items?.length ?? 0) === 0 ? 'Erst Zutaten hinzufügen' : ''}
              >
                Öffentlich – für alle sichtbar
              </option>
            </select>
            <span className="text-caption text-muted-foreground">
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
                notify.success('Sichtbarkeit geändert');
                setShowVisibilityConfirm(null);
              },
              onError: (err) => {
                notify.error('Sichtbarkeit konnte nicht geändert werden', { error: err });
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

      {/* Description — also shown when empty so editors can add it */}
      {(recipe.description || recipe.can_edit) && (
        <InlineEditor
          mode="markdown"
          label="Beschreibung"
          value={recipe.description}
          canEdit={recipe.can_edit ?? false}
          aiField="description"
          onSave={(val) => updateRecipe.mutateAsync({ description: val })}
          isSaving={updateRecipe.isPending}
        >
          <AnalysisSection
            icon="description"
            title="Beschreibung"
            defaultOpen={!recipe.description}
            accentColor="text-primary"
            preview={
              <div className="text-caption font-medium bg-muted px-2.5 py-1 rounded-full text-muted-foreground flex items-center gap-1">
                <span>{timeLabel || 'Ausführlich'}</span>
                {recipe.description && (
                  <>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">
                      {recipe.description.split(/\n+/).filter(line => line.trim().length > 0).length} {recipe.description.split(/\n+/).filter(line => line.trim().length > 0).length === 1 ? 'Absatz' : 'Absätze'}
                    </span>
                  </>
                )}
              </div>
            }
          >
            {recipe.description ? (
              <MarkdownRenderer content={recipe.description} />
            ) : (
              <p className="text-body text-muted-foreground">
                Noch keine Beschreibung hinterlegt. Ergänze sie über das Stift-Symbol.
              </p>
            )}
          </AnalysisSection>
        </InlineEditor>
      )}

      {/* Recipe Steps — read-only structured steps for viewers, editor for owners */}
      {recipe.can_edit ? (
        <AnalysisSection
          icon="format_list_numbered"
          title="Zubereitungsschritte"
          defaultOpen
          accentColor="text-info"
          preview={
            recipe.steps_count || legacyPreparationSteps.length ? (
              <div className="text-caption font-medium bg-info-soft text-info px-2.5 py-1 rounded-full">
                {recipe.steps_count || legacyPreparationSteps.length} {((recipe.steps_count || legacyPreparationSteps.length) === 1) ? 'Schritt' : 'Schritte'}
              </div>
            ) : (
              <span className="hidden text-caption text-muted-foreground sm:inline">Noch keine Schritte – hier anlegen</span>
            )
          }
        >
          {recipe.steps.length === 0 && legacyPreparationSteps.length > 0 && (
            <div className="mb-5 rounded-lg border border-info-border bg-info-soft p-4">
              <p className="mb-3 text-body font-semibold text-info">Zubereitung aus der Beschreibung</p>
              <RecipeStepsReadOnly steps={[]} fallbackInstructions={legacyPreparationSteps} />
              <p className="mt-3 text-caption text-muted-foreground">
                Diese älteren Schritte stehen noch in der Beschreibung. Du kannst sie dort bearbeiten oder unten als strukturierte Schritte neu anlegen.
              </p>
            </div>
          )}
          <StepEditor
            recipeSlug={recipe.slug}
            availableRecipeItems={recipe.recipe_items}
            onSave={() => {
              notify.success('Schritte gespeichert');
              // Optionally refetch recipe to update steps_count
            }}
            onError={(error) => {
              notify.error('Schritte konnten nicht gespeichert werden', { description: error });
            }}
          />
        </AnalysisSection>
      ) : (
        (recipe.steps.length > 0 || recipe.has_structured_steps || legacyPreparationSteps.length > 0) && (
          <AnalysisSection
            icon="format_list_numbered"
            title="Zubereitungsschritte"
            defaultOpen
            accentColor="text-info"
            preview={
              recipe.steps_count || legacyPreparationSteps.length ? (
                <div className="text-caption font-medium bg-info-soft text-info px-2.5 py-1 rounded-full">
                  {recipe.steps_count || legacyPreparationSteps.length} {((recipe.steps_count || legacyPreparationSteps.length) === 1) ? 'Schritt' : 'Schritte'}
                </div>
              ) : (
                <span className="text-caption text-muted-foreground">Keine strukturierten Schritte</span>
              )
            }
          >
            <RecipeStepsReadOnly
              steps={recipe.steps}
              fallbackInstructions={legacyPreparationSteps}
              scale={portionsMultiplier}
            />
          </AnalysisSection>
        )
      )}

      {/* Analyse-Tabs + Rezeptregeln */}
      {recipe.price_coverage != null && recipe.price_coverage.missing_ingredients > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-body text-warning">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {recipe.price_coverage.priced_ingredients === 0
              ? 'Keine Preise für dieses Rezept hinterlegt.'
              : `Nur ${recipe.price_coverage.priced_ingredients} von ${recipe.price_coverage.total_ingredients} Zutaten haben einen Preis – der angezeigte Preis ist unvollständig.`}
            {recipe.price_coverage.affected_items.length > 0 && (
              <span className="block mt-1 text-caption">
                Betroffen: {recipe.price_coverage.affected_items.map((item) => String(item.ingredient_name ?? '')).filter(Boolean).join(', ')}
              </span>
            )}
          </span>
        </div>
      )}
      {nb && nb.total_weight_g > 0 && (
        <AnalysisSection
          icon="analytics"
          title="Analyse"
          accentColor="text-primary"
          preview={<span className="hidden text-caption text-muted-foreground md:inline">Preis, Inhaltsstoffe, Gesundheit, Gewicht</span>}
        >
        <SectionBoundary title="Die Analyse konnte nicht angezeigt werden">
        <RecipeAnalysisTabs
          tabs={[
            ...(nb && displayedPriceTotal !== null && displayedPriceTotal > 0
              ? [{
                  id: 'price',
                  label: 'Preis',
                  content: (
                    <PriceTab
                      nb={nb}
                      displayedPriceTotal={displayedPriceTotal}
                      displayedPricePerPortion={displayedPricePerPortion}
                      topIngredientsByPrice={topIngredientsByPrice}
                      ingredientSlugById={ingredientSlugById}
                      recipeType={recipe.recipe_type}
                    />
                  ),
                }]
              : []),
            ...(nb && nb.total_weight_g > 0
              ? [{
                  id: 'nutrition',
                  label: 'Inhaltsstoffe',
                  content: (
                    <NutritionTab
                      nb={nb}
                      recipeType={recipe.recipe_type}
                      recipe={recipe}
                    />
                  ),
                }]
              : []),
            ...(nutriScore && nb && nb.total_weight_g > 0
              ? [{
                  id: 'health',
                  label: 'Gesundheit',
                  content: (
                    <HealthTab
                      nutriScore={nutriScore}
                      nb={nb}
                      recipeId={recipeId}
                      recipeType={recipe.recipe_type}
                    />
                  ),
                }]
              : []),
            ...(nb && nb.total_weight_g > 0 && topIngredientsByWeight.length > 0
              ? [{
                  id: 'weight',
                  label: 'Gewicht',
                  content: (
                    <WeightTab
                      nb={nb}
                      topIngredientsByWeight={topIngredientsByWeight}
                      ingredientSlugById={ingredientSlugById}
                      recipeType={recipe.recipe_type}
                    />
                  ),
                }]
              : []),
          ]}
        />
        </SectionBoundary>
        </AnalysisSection>
      )}

      {/* Rezeptregeln */}
      <RecipeRulesBox recipeId={recipeId} />

      {/* Similar Recipes */}
      {(recipe.next_best_recipes?.length ?? 0) > 0 && (
        <section>
          <h2 className="flex items-center gap-2 font-display text-section font-extrabold mb-4">
            <Sparkles className="w-5 h-5 text-spice" />
            Ähnliche Rezepte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recipe.next_best_recipes ?? []).map((similar) => (
              <Link
                key={similar.id}
                to={`/recipes/${similar.slug}`}
                className="card-hover group block rounded-xl bg-card p-4 shadow-card"
              >
                <h3 className="font-semibold text-body group-hover:text-primary transition-colors line-clamp-2">
                  {similar.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Usage in meal plans */}
      {(recipe.usage_in_meal_plans_count ?? 0) > 0 && (
        <RecipeUsageInMealPlans recipeId={recipeId} count={recipe.usage_in_meal_plans_count} className="lg:hidden" />
      )}

      <ContentLinkSection contentType="recipe" objectId={recipeId} />

      {/* Steckbrief on small screens; the desktop sidebar shows it next to the content */}
      <RecipeMetaCard recipe={recipe} className="lg:hidden" />

      {/* Emotions */}
      <section className="bg-card rounded-xl p-6 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-section font-extrabold mb-4">
          <Smile className="w-5 h-5 text-spice" />
          Wie findest du dieses Rezept?
        </h2>
        <ContentEmotions
          emotionCounts={recipe.emotion_counts ?? {}}
          userEmotion={recipe.user_emotion ?? null}
          onToggle={(emotionType) =>
            createEmotion.mutate({ emotion_type: emotionType }, { onError: (error) => notify.failed('Bewertung', 'gespeichert', error) })
          }
          isPending={createEmotion.isPending}
        />
      </section>

      {/* Comments */}
      <section className="bg-card rounded-xl p-6 shadow-card">
        <ContentComments
          comments={comments ?? []}
          onSubmit={(data) =>
            createComment.mutate(data, {
              onSuccess: () => notify.success('Kommentar gesendet'),
              onError: (error) => notify.failed('Kommentar', 'gesendet', error),
            })
          }
          isPending={createComment.isPending}
        />
      </section>
      </div>

      {/* Desktop Sidebar */}
      <RecipeSidebar
        recipe={recipe}
        recipeId={recipeId}
        portions={portionsMultiplier}
        totalPriceEur={displayedPriceTotal}
        totalWeightG={nb ? nb.total_weight_g * (isDirty ? 1 : portionsMultiplier) : null}
        onPortionsChange={setPortionsMultiplier}
        onOpenShoppingList={handleOpenShoppingList}
        hidePortionScaler={isInlineEditMode}
        canCook={canCook}
        onClone={() => {
          setCloneTitle(`${recipe.title} (Kopie)`);
          setShowCloneDialog(true);
        }}
      />
      </div>
      </div>

      <AddRecipeToMealPlanDialog
        open={mealPlanDialogOpen}
        onOpenChange={setMealPlanDialogOpen}
        recipeId={recipe.id}
        recipeTitle={recipe.title}
      />

      {/* Mobile Action Bar */}
      <RecipeMobileActionBar
        onOpenShoppingList={handleOpenShoppingList}
        onOpenPortions={() => setPortionSheetOpen(true)}
        onAddToMealPlan={openMealPlanDialog}
        recipeSlug={slug}
        canCook={canCook}
      />

      {/* Portion Bottom Sheet (Mobile) */}
      <PortionBottomSheet
        open={portionSheetOpen}
        onOpenChange={setPortionSheetOpen}
        portions={portionsMultiplier}
        onPortionsChange={setPortionsMultiplier}
      />

      <PdfExportDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        baseUrl={`${API_BASE_URL}/api/recipes/by-slug/${slug}/export/pdf/`}
        optionType="recipe"
      />

    </article>
    </EntityLinkContext.Provider>
  );
}
