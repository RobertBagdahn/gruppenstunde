/**
 * RecipeDetailPage — Full recipe detail with analysis panels.
 * Supports slug-based routing (/recipes/:slug).
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useRecipeBySlug, useRecipeImprovements, useRecipeNutritionBreakdown } from '@/api/recipes';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
} from '@/schemas/recipe';
import RecipeSidebar from '@/components/recipe/RecipeSidebar';
import RecipeHeaderInfo from '@/components/recipe/RecipeHeaderInfo';
import PortionScaler from '@/components/recipe/PortionScaler';
import RecipeImprovements from '@/components/recipe/RecipeImprovements';
import { NutritionContributionPanel } from '@/components/recipe/NutritionContributionPanel';
import { PositiveTraitsBadges } from '@/components/recipe/PositiveTraitsBadges';
import IngredientList from '@/components/supply/IngredientList';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorDisplay from '@/components/ErrorDisplay';
import Breadcrumb from '@/components/Breadcrumb';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: recipe, isLoading, error, refetch } = useRecipeBySlug(slug ?? '');
  const recipeId = recipe?.id ?? 0;

  const [servings, setServings] = useState<number | null>(null);
  const effectiveServings = servings ?? recipe?.servings ?? 1;
  const servingsMultiplier = effectiveServings;

  const { data: breakdown } = useRecipeNutritionBreakdown(recipeId);
  const { data: improvements } = useRecipeImprovements(recipeId);

  useDocumentMeta({
    title: recipe ? `${recipe.title} – Inspi` : 'Rezept – Inspi',
    description: recipe?.summary || undefined,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel =
    RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === recipe.execution_time)?.label ??
    recipe.execution_time;

  // Filter broken RecipeHints from improvements
  const brokenHints = improvements?.items.filter((imp) => imp.source === 'recipe_hint' || imp.source === 'merged') ?? [];

  return (
    <EntityLinkContext.Provider value="detail">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Rezepte', href: '/recipes' },
            { label: recipe.title },
          ]}
        />

        <div className="flex gap-8 mt-6">
          {/* Main Content */}
          <main className="flex-1 min-w-0 space-y-8">
            {/* Hero Image */}
            {recipe.image_url && (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                loading="lazy"
                className="w-full h-56 md:h-72 object-cover rounded-2xl"
              />
            )}

            {/* Title & Meta */}
            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-bold">{recipe.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {typeOpt && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-rose-600">{typeOpt.icon}</span>
                    <span className="text-rose-600 font-medium">{typeOpt.label}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">timer</span>
                  {timeLabel}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">signal_cellular_alt</span>
                  {difficultyLabel}
                </span>
                {recipe.servings && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    {recipe.servings} Portionen
                  </span>
                )}
              </div>
              {recipe.summary && (
                <p className="text-muted-foreground">{recipe.summary}</p>
              )}
            </div>

            {/* Mobile: NutriScore + Price */}
            <RecipeHeaderInfo
              nutriClass={recipe.cached_nutri_class}
              priceTotal={recipe.cached_price_total}
            />

            {/* Mobile: Portion Scaler */}
            <div className="lg:hidden">
              <PortionScaler
                defaultServings={recipe.servings ?? 1}
                onChange={setServings}
              />
            </div>

            {/* === ZUTATENLISTE (prominent, direkt unter Header) === */}
            {recipe.recipe_items.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">grocery</span>
                  Zutaten
                </h2>
                <div className="bg-card rounded-xl border p-5">
                  <IngredientList
                    items={recipe.recipe_items}
                    servings={recipe.servings}
                    servingsMultiplier={servingsMultiplier}
                    className="text-base"
                  />
                </div>
              </section>
            )}

            {/* Zubereitung */}
            {recipe.description && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">menu_book</span>
                  Zubereitung
                </h2>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={recipe.description} />
                </div>
              </section>
            )}

            {/* === GEBROCHENE RECIPE HINTS === */}
            {brokenHints.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">health_and_safety</span>
                  Ernährungs-Hinweise
                </h2>
                <div className="space-y-3">
                  {brokenHints.map((hint, idx) => {
                    const levelStyles: Record<string, string> = {
                      error: 'border-red-300 bg-red-50',
                      warn: 'border-amber-300 bg-amber-50',
                      info: 'border-blue-200 bg-blue-50',
                    };
                    const levelIcons: Record<string, { icon: string; color: string }> = {
                      error: { icon: 'error', color: 'text-red-600' },
                      warn: { icon: 'warning', color: 'text-amber-600' },
                      info: { icon: 'info', color: 'text-blue-600' },
                    };
                    const style = levelStyles[hint.hint_level] ?? 'border-gray-200 bg-gray-50';
                    const iconCfg = levelIcons[hint.hint_level] ?? { icon: 'info', color: 'text-gray-600' };

                    return (
                      <div
                        key={`hint-${hint.parameter}-${idx}`}
                        className={`rounded-xl border p-4 ${style}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`material-symbols-outlined text-xl mt-0.5 ${iconCfg.color}`}>
                            {iconCfg.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{hint.parameter_label}</p>
                            {hint.recommendation_text && (
                              <p className="text-sm text-muted-foreground mt-1">{hint.recommendation_text}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Aktuell: <span className="font-medium">{hint.current_value.toFixed(1)} {hint.unit}</span>
                              {' → '}Ziel: <span className="font-medium">{hint.threshold_value.toFixed(1)} {hint.unit}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Positive Traits */}
            {breakdown && breakdown.positive_traits.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">eco</span>
                  Positive Eigenschaften
                </h2>
                <PositiveTraitsBadges traits={breakdown.positive_traits} />
              </section>
            )}

            {/* Verbesserungsvorschläge (full merged list) */}
            {recipeId > 0 && breakdown && (
              <section>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600">trending_up</span>
                  Verbesserungsvorschläge
                </h2>
                <RecipeImprovements recipeId={recipeId} breakdownItems={breakdown.items} />
              </section>
            )}

            {/* Nährwert-Analyse */}
            {breakdown && breakdown.items.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-600">analytics</span>
                  Nährwert-Analyse
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NutritionContributionPanel parameter="energy" items={breakdown.items} unit="kcal" />
                  <NutritionContributionPanel parameter="protein" items={breakdown.items} unit="g" />
                  <NutritionContributionPanel parameter="fat" items={breakdown.items} unit="g" />
                  <NutritionContributionPanel parameter="sugar" items={breakdown.items} unit="g" />
                </div>
              </section>
            )}
          </main>

          {/* Desktop Sidebar */}
          <RecipeSidebar
            recipe={recipe}
            recipeId={recipeId}
            servings={effectiveServings}
            onServingsChange={setServings}
            onOpenShoppingList={() => {/* TODO */}}
          />
        </div>
      </div>
    </EntityLinkContext.Provider>
  );
}
