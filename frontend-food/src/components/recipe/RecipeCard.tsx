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
  const costsLabel = pricePerPortion != null ? `${formatEuro(pricePerPortion)} pro Portion` : null;

  const hasActions = (canEdit && onEdit) || (canDelete && onDelete) || onClone;
  const nutriClass = recipe.cached_nutri_class;

  const effectiveBadge = recipe.status === 'draft'
    ? 'draft'
    : (recipe.recipe_badge && recipe.recipe_badge !== 'verified' ? recipe.recipe_badge : null);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group block rounded-xl bg-card overflow-hidden shadow-card card-hover"
    >
      {/* Image with gradient overlay */}
      <div className="relative overflow-hidden aspect-square">
        <RecipeThumbnail
          imageUrl={recipe.image_url}
          title={recipe.title}
          size="md"
          aspectRatio="square"
          className="absolute inset-0"
          imgClassName="transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        {/* Like badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-caption font-bold text-area-recipes shadow-card">
          <Icon name="favorite" size={16} />
          {recipe.like_score}
        </div>
        {/* Type badge */}
        {typeOpt && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-caption font-bold text-area-recipes shadow-card">
            <Icon name={typeOpt.icon} size={16} />
            {typeOpt.label}
          </div>
        )}
        {/* Nutri-Score & Recipe badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {effectiveBadge && (
            <RecipeBadge badge={effectiveBadge as 'draft' | 'verified' | 'community' | 'personal'} />
          )}
          <NutriScoreBadge value={nutriClass} size="sm" className="h-6 min-w-6 shadow-card" />
        </div>
        {/* Admin action icons */}
        {hasActions && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {canEdit && onEdit && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm text-foreground shadow-md hover:bg-white transition-colors"
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
                className="flex items-center justify-center w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm text-destructive shadow-md hover:bg-white transition-colors"
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
                className="flex items-center justify-center w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm text-primary shadow-md hover:bg-white transition-colors"
                title="Rezept clonen"
              >
                <Icon name="content_copy" size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-3.5">
        <h3 className="font-bold text-body group-hover:text-primary transition-colors line-clamp-2">
          <SearchHighlight text={recipe.title} query={searchQuery} />
        </h3>

        {recipe.summary && (
          <p className="text-caption text-muted-foreground mt-1 line-clamp-1">
            <SearchHighlight text={recipe.summary} query={searchQuery} />
          </p>
        )}

        {/* Key facts only (food-progressive-disclosure): time and cost; Nutri-Score sits on the image. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <span className="flex items-center gap-1">
            <Icon name="schedule" size={16} />
            {timeLabel}
          </span>
          {costsLabel && (
            <span className="flex items-center gap-1 tabular-nums">
              <Icon name="payments" size={16} />
              {costsLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
