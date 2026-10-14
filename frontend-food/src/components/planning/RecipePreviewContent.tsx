import { useState } from 'react';
import { BadgeCheck, ChefHat, ChevronDown, ExternalLink, Euro, Flame, TriangleAlert, Users, Utensils } from 'lucide-react';
import { useRecipePreview } from '@/api/mealPlans';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecipeSearchResult } from '@/schemas/mealPlan';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

const RECIPE_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  warm_meal: 'Warme Mahlzeit',
  cold_meal: 'Kalte Mahlzeit',
  snack: 'Snack',
  drink: 'Getränk',
  dessert: 'Dessert',
};

export function recipeTypeLabel(type: string): string {
  return RECIPE_TYPE_LABELS[type] ?? 'Rezept';
}

function formatOptionalBadge(value: number | null | undefined, suffix: string): string | null {
  return value == null ? null : `${Math.round(value)} ${suffix}`;
}

const DESCRIPTION_COLLAPSED_LENGTH = 180;

interface RecipePreviewContentProps {
  recipe: RecipeSearchResult;
  normPortions: number;
}

/** Full recipe details shared by the desktop preview column and the phone bottom sheet. */
export default function RecipePreviewContent({ recipe, normPortions }: RecipePreviewContentProps) {
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const { data: preview, isLoading } = useRecipePreview(recipe.id, normPortions);

  const description = preview?.description ?? recipe.description ?? '';
  const longDescription = description.length > DESCRIPTION_COLLAPSED_LENGTH;
  const shownDescription = longDescription && !descriptionOpen
    ? `${description.slice(0, DESCRIPTION_COLLAPSED_LENGTH).trimEnd()} …`
    : description;
  const tags = preview?.nutritional_tags ?? recipe.nutritional_tags?.map((tag) => ({ ...tag, is_dangerous: false })) ?? [];
  const allergens = preview?.allergens ?? [];
  const regularTags = tags.filter((tag) => !tag.is_dangerous);
  const ingredients = preview?.ingredients ?? [];
  const previewNames = recipe.ingredients_preview ?? [];
  const hasNutrition = recipe.cached_energy_kcal != null || recipe.cached_protein_g != null;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-caption font-semibold text-primary mb-2">
          <ChefHat className="w-4 h-4" />
          {recipeTypeLabel(recipe.recipe_type)}
          {recipe.recipe_badge === 'verified' && (
            <span className="inline-flex items-center gap-1 text-muted-foreground"><BadgeCheck className="w-3.5 h-3.5" />Verifiziert</span>
          )}
        </div>
        <h3 className="font-display font-bold text-section text-foreground leading-tight break-words">{recipe.title}</h3>

        {(allergens.length > 0 || regularTags.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-caption" data-testid="recipe-preview-tags">
            {allergens.map((name) => (
              <span key={`allergen-${name}`} className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 font-semibold text-warning">
                <TriangleAlert className="w-3 h-3" aria-hidden="true" />
                {name}
              </span>
            ))}
            {regularTags.map((tag) => (
              <span key={tag.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{tag.name}</span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-caption">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-card px-3 py-2 font-semibold text-foreground break-words shadow-card">
            <Users className="w-3.5 h-3.5 text-primary" />
            {normPortions} Personen
          </span>
          {recipe.price_per_serving != null && (
            <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-card px-3 py-2 font-semibold text-foreground break-words shadow-card">
              <Euro className="w-3.5 h-3.5 text-success" />
              {formatNumber(recipe.price_per_serving * normPortions, { maxDecimals: 2 })} € gesamt
            </span>
          )}
        </div>

        <a
          href={`/recipes/${recipe.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-caption font-semibold text-primary hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          Rezept ansehen
        </a>
      </div>

      {description && (
        <div className="space-y-1 text-caption">
          <MarkdownRenderer content={shownDescription} className="text-muted-foreground leading-relaxed break-words" />
          {longDescription && (
            <button
              type="button"
              onClick={() => setDescriptionOpen((open) => !open)}
              className="font-semibold text-primary hover:underline"
            >
              {descriptionOpen ? 'Weniger' : 'Mehr'}
            </button>
          )}
        </div>
      )}

      {(ingredients.length > 0 || previewNames.length > 0 || isLoading) && (
        <div className="rounded-xl bg-card p-3 shadow-card text-caption">
          <div className="flex items-center gap-2 font-semibold text-foreground mb-2">
            <Utensils className="w-3.5 h-3.5 text-primary" />
            {ingredientsOpen ? 'Alle Zutaten' : 'Enthält unter anderem'}
          </div>
          {isLoading && ingredients.length === 0 ? (
            <div className="space-y-2" role="status" aria-label="Zutaten werden geladen">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : ingredientsOpen ? (
            <ul className="space-y-1" data-testid="recipe-preview-ingredients">
              {ingredients.map((row, index) => (
                <li key={`${row.name}-${index}`} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 break-words text-foreground">{row.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{row.amount_label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground leading-relaxed break-words">
              {(ingredients.length > 0 ? ingredients.map((row) => row.name) : previewNames).slice(0, 8).join(' · ')}
            </p>
          )}
          {ingredients.length > 0 && (
            <button
              type="button"
              aria-expanded={ingredientsOpen}
              onClick={() => setIngredientsOpen((open) => !open)}
              className="mt-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              {ingredientsOpen ? 'Weniger anzeigen' : `Alle ${ingredients.length} Zutaten mit Mengen`}
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', ingredientsOpen && 'rotate-180')} />
            </button>
          )}
        </div>
      )}

      {hasNutrition && (
        <div className="rounded-xl bg-card p-3 space-y-2 shadow-card">
          <div className="flex items-center gap-2 text-caption font-semibold text-foreground"><Flame className="w-3.5 h-3.5 text-primary" />Nährwerte</div>
          <div className="flex flex-wrap gap-2 text-caption text-muted-foreground">
            {formatOptionalBadge(recipe.cached_energy_kcal, 'kcal/100 g') && <span>{formatOptionalBadge(recipe.cached_energy_kcal, 'kcal/100 g')}</span>}
            {formatOptionalBadge(recipe.cached_protein_g, 'g Protein/100 g') && <span>{formatOptionalBadge(recipe.cached_protein_g, 'g Protein/100 g')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
