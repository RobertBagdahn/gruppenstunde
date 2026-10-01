import { Link } from 'react-router-dom';
import type { RecipeListItem } from '@/schemas/recipe';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  getRecipeExecutionTimeLabel,
} from '@/schemas/recipe';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';
import RecipeBadge from './RecipeBadge';
import SearchHighlight from './SearchHighlight';
import RecipeThumbnail from './RecipeThumbnail';
import { formatEuro } from '@/lib/format';
import { recipePricePerPortion } from '@/lib/recipeCostRanges';
import { Icon } from '@/components/ui/icon';

const TAG_COLORS = [
  'bg-primary/10 text-primary border border-primary/20',
  'bg-info-soft text-info border border-info-border',
  'bg-warning-soft text-warning border border-warning-border',
  'bg-warning-soft text-warning border border-warning-border',
  'bg-danger-soft text-danger border border-danger-border',
];

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
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel = getRecipeExecutionTimeLabel(recipe.execution_time);
  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);
  const pricePerPortion = recipePricePerPortion(recipe);
  const costsLabel = pricePerPortion != null ? formatEuro(pricePerPortion) : null;

  const hasActions = (canEdit && onEdit) || (canDelete && onDelete) || onClone;
  const nutriClass = recipe.cached_nutri_class;
  const nutriColors = nutriClass ? NUTRI_SCORE_COLORS[nutriClass] : null;

  const effectiveBadge = recipe.status === 'draft'
    ? 'draft'
    : (recipe.recipe_badge && recipe.recipe_badge !== 'verified' ? recipe.recipe_badge : null);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group block rounded-xl bg-card overflow-hidden shadow-soft card-hover border border-border hover:border-primary/40 hover:shadow-colorful"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-warning-soft" />
        {/* Like badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-caption font-extrabold text-danger shadow-md">
          <Icon name="favorite" size={16} />
          {recipe.like_score}
        </div>
        {/* Type badge */}
        {typeOpt && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-caption font-extrabold text-warning shadow-md">
            <Icon name={typeOpt.icon} size={16} />
            {typeOpt.label}
          </div>
        )}
        {/* Nutri-Score & Recipe badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {effectiveBadge && (
            <RecipeBadge badge={effectiveBadge as 'draft' | 'verified' | 'community' | 'personal'} />
          )}
          {nutriColors && (
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${nutriColors.bg} ${nutriColors.text} text-caption font-extrabold shadow-md`}>
              {nutriColors.label}
            </div>
          )}
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

      <div className="p-3">
        <h3 className="font-extrabold text-body group-hover:text-primary transition-colors line-clamp-2">
          <SearchHighlight text={recipe.title} query={searchQuery} />
        </h3>

        {recipe.summary && (
          <p className="text-caption text-muted-foreground mt-1 line-clamp-2">
            <SearchHighlight text={recipe.summary} query={searchQuery} />
          </p>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <span
                key={tag.id}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption font-bold ${TAG_COLORS[index % TAG_COLORS.length]}`}
              >
                {tag.icon && <Icon name={tag.icon} size={16} className="mr-0.5" />}
                {tag.name}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30 px-2 py-0.5 text-caption font-bold">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border text-caption font-semibold text-muted-foreground">
          <span className="flex items-center gap-1 bg-info-soft rounded-full px-2 py-0.5">
            <Icon name="schedule" size={16} className="text-info" />
            {timeLabel}
          </span>
          <span className="flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5">
            <Icon name="signal_cellular_alt" size={16} className="text-primary" />
            {difficultyLabel}
          </span>
          {costsLabel && (
            <span className="flex items-center gap-1 bg-warning-soft rounded-full px-2 py-0.5">
              <Icon name="payments" size={16} className="text-warning" />
              {costsLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
