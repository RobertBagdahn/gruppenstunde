import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Smile, GitFork, UtensilsCrossed } from 'lucide-react';
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
  RECIPE_DIFFICULTY_OPTIONS as _DIFF,
  RECIPE_EXECUTION_TIME_OPTIONS,
} from '@/schemas/recipe';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorDisplay from '@/components/ErrorDisplay';
import ContentComments from '@/components/content/ContentComments';
import ContentEmotions from '@/components/content/ContentEmotions';
import InlineEditor from '@/components/content/InlineEditor';
import TitleImageEditor from '@/components/content/TitleImageEditor';
import IngredientList from '@/components/supply/IngredientList';
import InlineIngredientEditor from '@/components/recipe/InlineIngredientEditor';
import { ContentLinkSection } from '@/components/content/ContentLinkSection';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Breadcrumb from '@/components/Breadcrumb';
import RecipeRulesBox from '@/components/recipe/RecipeRulesBox';

import RecipeMetaCard from '@/components/recipe/RecipeMetaCard';
import RecipeSidebar from '@/components/recipe/RecipeSidebar';
import RecipeMobileActionBar from '@/components/recipe/RecipeMobileActionBar';
import RecipeUsageInMealPlans from '@/components/recipe/RecipeUsageInMealPlans';
import RecipeCookingMode from '@/pages/recipes/RecipeCookingMode';
import PortionBottomSheet from '@/components/recipe/PortionBottomSheet';
import ScaleIngredientsDialog from '@/components/recipe/ScaleIngredientsDialog';
import { useRecipeModificationStore } from '@/store/useRecipeModificationStore';
import { toast } from 'sonner';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { RecipeAnalysisTabs } from '@/components/recipe/RecipeAnalysisTabs';
import { PriceTab } from '@/components/recipe/PriceTab';
import { NutritionTab } from '@/components/recipe/NutritionTab';
import { HealthTab } from '@/components/recipe/HealthTab';
import { WeightTab } from '@/components/recipe/WeightTab';

// --- Collapsible Section Component ---
function AnalysisSection({
  icon,
  title,
  defaultOpen = false,
  children,
  accentColor = 'text-primary',
  preview,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentColor?: string;
  preview?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-6 bg-card rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/50 transition-colors"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <span className={`material-symbols-outlined text-[18px] ${accentColor}`}>{icon}</span>
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {preview && <div className="shrink-0">{preview}</div>}
          <span
            className={`material-symbols-outlined text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </div>
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </section>
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
  const { data: nutritionBreakdown } = useRecipeNutritionBreakdown(recipeId, 25, 'male');
  const forkRecipe = useForkRecipe(recipeId);
  const forkAndSaveRecipe = useForkAndSaveRecipe(recipeId);
  const updateVisibility = useUpdateVisibility(recipeId);
  const uploadImage = useUploadRecipeImage(recipeId);
  const deleteImage = useDeleteRecipeImage(recipeId);
  const setImageFromUrl = useSetRecipeImageFromUrl(recipeId);

  const [portionsMultiplier, setPortionsMultiplier] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShoppingExport, setShowShoppingExport] = useState(false);
  const [exportPortions, setExportPortions] = useState(1);
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState<string | null>(null);
  const [portionSheetOpen, setPortionSheetOpen] = useState(false);
  const [isInlineEditMode, setIsInlineEditMode] = useState(
    searchParams.get('edit') === 'ingredients',
  );
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);

  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneTitle, setCloneTitle] = useState('');

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
  const modifiedPortions = useRecipeModificationStore((s) => s.modifiedPortions);
  const initializeModifications = useRecipeModificationStore((s) => s.initialize);
  const resetModifications = useRecipeModificationStore((s) => s.reset);
  const scaleToNormPortion = useRecipeModificationStore((s) => s.scaleToNormPortion);
  const scaleByFactor = useRecipeModificationStore((s) => s.scaleByFactor);

  // Initialize modification store when nutrition breakdown data loads
  useEffect(() => {
    if (nutritionBreakdown && recipe && !isDirty) {
      initializeModifications(nutritionBreakdown.items, recipe.portions);
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
    const totalEnergyKcal = items.reduce((s, i) => s + i.energy_kcal, 0);
    const totalProteinG = items.reduce((s, i) => s + i.protein_g, 0);
    const totalFatG = items.reduce((s, i) => s + i.fat_g, 0);
    const totalFatSatG = items.reduce((s, i) => s + i.fat_sat_g, 0);
    const totalCarbohydrateG = items.reduce((s, i) => s + i.carbohydrate_g, 0);
    const totalSugarG = items.reduce((s, i) => s + i.sugar_g, 0);
    const totalFibreG = items.reduce((s, i) => s + i.fibre_g, 0);
    const totalSaltG = items.reduce((s, i) => s + i.salt_g, 0);
    const portions = modifiedPortions ?? 1;

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
      per_serving_energy_kcal: totalEnergyKcal / portions,
      per_serving_protein_g: totalProteinG / portions,
      per_serving_fat_g: totalFatG / portions,
      per_serving_carbohydrate_g: totalCarbohydrateG / portions,
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
  }, [nutritionBreakdown, isDirty, modifiedItems, modifiedPortions]);
  const effectivePortions = (isDirty ? modifiedPortions : recipe?.portions) ?? 1;
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
        portionsMultiplier={portionsMultiplier}
        onPortionsChange={setPortionsMultiplier}
      />
    );
  }


  const timeLabel =
    RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === recipe.execution_time)?.label ??
    recipe.execution_time;

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
      {/* Title + Summary */}
      <div className="mb-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{recipe.title}</h1>
        {/* Compact Summary */}
        {recipe.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {recipe.summary}
          </p>
        )}
      </div>

      {/* Edit + Delete + Print Buttons */}
      <div className="flex items-center justify-end gap-2">
        <a
          href={`/recipes/${recipe.slug}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          title="Druckansicht öffnen"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          <span className="hidden sm:inline">Drucken</span>
        </a>
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

      {/* Fork hint */}
      {recipe.forked_from_title && (
        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <GitFork className="w-3.5 h-3.5 shrink-0" />
          {recipe.forked_from_slug ? (
            <>
              Basiert auf{' '}
              <Link
                to={`/recipes/${recipe.forked_from_slug}`}
                className="underline underline-offset-2 hover:text-primary transition-colors"
              >
                {recipe.forked_from_title}
              </Link>
            </>
          ) : (
            <>Basiert auf {recipe.forked_from_title}</>
          )}
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
                  const portions = modifiedPortions ?? 1;
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
                        quantity: mod.quantity / portions, // Normalize to 1-portion
                        measuring_unit_id: orig.measuring_unit_id ?? null,
                        sort_order: orig.sort_order ?? 0,
                        note: orig.note ?? '',
                      };
                    })
                    .filter((item) => item !== null);
                  forkAndSaveRecipe.mutate(
                    { portions: 1, recipe_items: itemsPayload },
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
                   const portions = modifiedPortions ?? 1;
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
                         quantity: mod.quantity / portions, // Normalize to 1-portion
                         measuring_unit_id: orig.measuring_unit_id ?? null,
                         sort_order: orig.sort_order ?? 0,
                         note: orig.note ?? '',
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

          <div className="border-t border-amber-200 pt-3">
            <button
              type="button"
              onClick={() => setScaleDialogOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">scale</span>
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
      {nb && (isDirty ? modifiedPortions : recipe.portions) && (isDirty ? modifiedPortions : recipe.portions)! > 0 && (() => {
        // DGE reference: 15yo male, PAL 1.5 = 2868 kcal daily (approx. 12000 kJ)
        const dailyEnergyKcal = 2868;
        const mealFractions: Record<string, number> = {
          breakfast: 0.25, warm_meal: 0.35, cold_meal: 0.25,
          dessert: 0.10, recipe_part: 0.10, drink: 0.05, snack: 0.10, ingredient: 0.05,
        };
        const fraction = mealFractions[recipe.recipe_type] ?? 0.30;
        const expectedEnergyKcal = dailyEnergyKcal * fraction;
        const effectivePortions = (isDirty ? modifiedPortions : recipe.portions) ?? 1;
        const perServingEnergyKcal = nb.total_energy_kcal / effectivePortions;
        const ratio = perServingEnergyKcal / expectedEnergyKcal;

        if (ratio > 1.5) {
          const normFactor = expectedEnergyKcal / perServingEnergyKcal;
          return (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-orange-300 bg-orange-50 p-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-orange-600 mt-0.5">warning</span>
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Diese Portion ist größer als eine Normportion
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Energie pro Portion: {Math.round(perServingEnergyKcal)} kcal (Referenz: {Math.round(expectedEnergyKcal)} kcal)
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

      {/* Recipe Meta Card (Unified & Compact) — mobile only, desktop uses sidebar */}
      <RecipeMetaCard
        recipe={recipe}
        portions={portionsMultiplier}
        totalPriceEur={displayedPriceTotal}
        className="mt-6 lg:hidden"
      />



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

      {/* Recipe Items (Ingredients) — using IngredientList component */}
      <section className="mt-8 bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-xl font-semibold leading-tight">
                Zutaten
                {(recipe.recipe_items?.length ?? 0) > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {recipe.recipe_items?.length} Zutaten
                  </span>
                )}
              </h2>
              {!isInlineEditMode && (
                <p className="text-sm text-muted-foreground leading-tight">
                  {portionsMultiplier === 1 ? 'pro Portion' : `für ${portionsMultiplier} Portionen`}
                </p>
              )}
            </div>
          </div>
          {!isInlineEditMode && (
            <div className="flex items-center gap-2">
              {recipe.can_edit && (
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
          )}
        </div>

        {isInlineEditMode ? (
          <InlineIngredientEditor
            recipeId={recipe.id}
            items={recipe.recipe_items ?? []}
            portions={recipe.portions}
            displayPortions={portionsMultiplier > 1 ? portionsMultiplier : undefined}
            onClose={() => {
              setIsInlineEditMode(false);
              const next = new URLSearchParams(searchParams);
              next.delete('edit');
              setSearchParams(next, { replace: true });
            }}
            onSaved={() => {
              setIsInlineEditMode(false);
              refetch();
              const next = new URLSearchParams(searchParams);
              next.delete('edit');
              setSearchParams(next, { replace: true });
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
            portions={isDirty ? (modifiedPortions ?? 1) : 1}
            portionsMultiplier={isDirty ? 1 : portionsMultiplier}
            availableConversions={availableConversions?.items}
          />
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
                className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))] border border-[hsl(var(--chart-2))]/20 px-3 py-1 text-sm font-medium"
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
                onClick={() => setExportPortions(Math.max(1, exportPortions - 1))}
                className="w-10 h-10 flex items-center justify-center border rounded-lg hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <input
                type="number"
                min={1}
                max={999}
                value={exportPortions}
                onChange={(e) => setExportPortions(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center text-lg font-semibold border rounded-lg py-2 bg-background"
              />
              <button
                type="button"
                onClick={() => setExportPortions(exportPortions + 1)}
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
                    { recipeId: recipe.id, portions: exportPortions },
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

      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={(open) => { if (!open) setShowCloneDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="material-symbols-outlined text-primary">content_copy</span>
              Rezept clonen
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Erstelle eine persönliche Kopie dieses Rezepts. Du kannst sie danach frei bearbeiten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block text-sm font-medium">Name für die Kopie</label>
            <input
              type="text"
              value={cloneTitle}
              onChange={(e) => setCloneTitle(e.target.value)}
              placeholder="Name des Rezepts"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCloneDialog(false)}
              className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition"
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
                      toast.success('Rezept geklont');
                      navigate(`/recipes/${forkedRecipe.slug}`);
                    },
                    onError: (err) => {
                      toast.error('Fehler beim Klonen', { description: err.message });
                    },
                  },
                );
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {forkRecipe.isPending ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
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

      {/* Description (Zubereitung) — default open, direkt nach Zutaten */}
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
            defaultOpen={false}
            accentColor="text-primary"
            preview={
              <div className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full text-muted-foreground flex items-center gap-1">
                <span>{timeLabel || 'Ausführlich'}</span>
                {recipe.description && (
                  <>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">
                      {recipe.description.split(/\n+/).filter(line => line.trim().length > 0).length} {recipe.description.split(/\n+/).filter(line => line.trim().length > 0).length === 1 ? 'Schritt' : 'Schritte'}
                    </span>
                  </>
                )}
              </div>
            }
          >
            <MarkdownRenderer content={recipe.description} />
          </AnalysisSection>
        </InlineEditor>
      )}

      {/* Analyse-Tabs + Rezeptregeln */}
      {nb && nb.total_weight_g > 0 && (
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
                      effectivePortions={effectivePortions}
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
                      effectivePortions={effectivePortions}
                      topIngredientsByWeight={topIngredientsByWeight}
                      ingredientSlugById={ingredientSlugById}
                      recipeType={recipe.recipe_type}
                    />
                  ),
                }]
              : []),
          ]}
        />
      )}

      {/* Rezeptregeln */}
      <RecipeRulesBox recipeId={recipeId} />

      {/* Similar Recipes */}
      {(recipe.next_best_recipes?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            Ähnliche Rezepte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recipe.next_best_recipes ?? []).map((similar) => (
              <Link
                key={similar.id}
                to={`/recipes/${similar.slug}`}
                className="group block rounded-xl bg-card border p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                  {similar.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Usage in meal plans */}
      {(recipe.usage_in_meal_plans_count ?? 0) > 0 && (
        <RecipeUsageInMealPlans count={recipe.usage_in_meal_plans_count} />
      )}

      <ContentLinkSection contentType="recipe" objectId={recipeId} />

      {/* Emotions */}
      <section className="mt-8 bg-card rounded-xl border p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <Smile className="w-5 h-5 text-accent" />
          Wie findest du dieses Rezept?
        </h2>
        <ContentEmotions
          emotionCounts={recipe.emotion_counts ?? {}}
          userEmotion={recipe.user_emotion ?? null}
          onToggle={(emotionType) => createEmotion.mutate({ emotion_type: emotionType })}
          isPending={createEmotion.isPending}
        />
      </section>

      {/* Comments */}
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
        portions={portionsMultiplier}
        totalPriceEur={displayedPriceTotal}
        onPortionsChange={setPortionsMultiplier}
        onOpenShoppingList={handleOpenShoppingList}
        onClone={() => {
          setCloneTitle(`${recipe.title} (Kopie)`);
          setShowCloneDialog(true);
        }}
      />

      {/* Mobile Action Bar */}
      <RecipeMobileActionBar
        onOpenShoppingList={handleOpenShoppingList}
        onOpenPortions={() => setPortionSheetOpen(true)}
      />

      {/* Portion Bottom Sheet (Mobile) */}
      <PortionBottomSheet
        open={portionSheetOpen}
        onOpenChange={setPortionSheetOpen}
        portions={portionsMultiplier}
        onPortionsChange={setPortionsMultiplier}
      />


    </article>
    </EntityLinkContext.Provider>
  );
}
