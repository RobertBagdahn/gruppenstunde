import { Link } from 'react-router-dom';
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';
import type { RecipeListItem } from '@/schemas/recipe';
import {
  RECIPE_TYPE_OPTIONS,
  getRecipeExecutionTimeLabel,
} from '@/schemas/recipe';
import RecipeBadge from './RecipeBadge';
import SearchHighlight from './SearchHighlight';
import RecipeThumbnail from './RecipeThumbnail';
import { formatEuro } from '@/lib/format';
import { recipePricePerPortion } from '@/lib/recipeCostRanges';
import { Icon } from '@/components/ui/icon';

interface RecipeCardProps {
  recipe: RecipeListItem;
  searchQuery?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onClone?: () => void;
}

export default function RecipeCard({ recipe, searchQuery, canEdit, canDelete, onEdit, onDelete, onClone }: RecipeCardProps) {
  const timeLabel = getRecipeExecutionTimeLabel(recipe.execution_time);
  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);
  const pricePerPortion = recipePricePerPortion(recipe);

  const hasActions = (canEdit && onEdit) || (canDelete && onDelete) || onClone;
  const nutriClass = recipe.cached_nutri_class;

  const effectiveBadge = recipe.status === 'draft'
    ? 'draft'
    : (recipe.recipe_badge && recipe.recipe_badge !== 'verified' ? recipe.recipe_badge : null);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group flex flex-col rounded-xl bg-card overflow-hidden shadow-card card-hover"
    >
      {/* Image with gradient overlay */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <RecipeThumbnail
          imageUrl={recipe.image_url}
          title={recipe.title}
          size="md"
          aspectRatio="square"
          className="absolute inset-0"
          imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
        />
                {/* Like badge */}
        {recipe.like_score > 0 && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-caption font-bold text-spice shadow-soft backdrop-blur-sm">
            <Icon name="favorite" size={16} />
            {recipe.like_score}
          </div>
        )}
        {/* Nutri-Score & Recipe badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {effectiveBadge && (
            <RecipeBadge badge={effectiveBadge as 'draft' | 'verified' | 'community' | 'personal'} />
          )}
          <NutriScoreBadge value={nutriClass} size="sm" className="h-7 min-w-7 text-body ring-2 ring-card" />
        </div>
        {/* Admin action icons */}
        {hasActions && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {canEdit && onEdit && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                className="press flex items-center justify-center w-8 h-8 rounded-full bg-card/95 backdrop-blur-sm text-foreground shadow-md hover:bg-white transition-colors"
                title="Bearbeiten"
              >
                <Icon name="edit" size={16} />
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="press flex items-center justify-center w-8 h-8 rounded-full bg-card/95 backdrop-blur-sm text-destructive shadow-md hover:bg-white transition-colors"
                title="Löschen"
              >
                <Icon name="delete" size={16} />
              </button>
            )}
            {onClone && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClone();
                }}
                className="press flex items-center justify-center w-8 h-8 rounded-full bg-card/95 backdrop-blur-sm text-primary shadow-md hover:bg-white transition-colors"
                title="Rezept clonen"
              >
                <Icon name="content_copy" size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {typeOpt && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-area-recipes-soft px-2.5 py-0.5 text-caption font-bold text-spice-foreground">
            <Icon name={typeOpt.icon} size={16} />
            {typeOpt.label}
          </span>
        )}
        <h3 className="font-display text-emphasis font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
          <SearchHighlight text={recipe.title} query={searchQuery} />
        </h3>

        {recipe.summary && (
          <p className="text-caption text-muted-foreground line-clamp-2">
            <SearchHighlight text={recipe.summary} query={searchQuery} />
          </p>
        )}

        {/* Key facts only (food-progressive-disclosure): time and cost; Nutri-Score sits on the image. */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2 text-caption text-muted-foreground">
          <span className="flex items-center gap-1">
            <Icon name="schedule" size={16} />
            {timeLabel}
          </span>
          {pricePerPortion != null && (
            <span className="tabular-nums">
              <strong className="text-body font-bold text-foreground">{formatEuro(pricePerPortion)}</strong> pro Portion
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
