import { Link } from 'react-router-dom';
import type { RecipeListItem } from '@/schemas/recipe';
import {
  RECIPE_DIFFICULTY_OPTIONS,
  getRecipeExecutionTimeLabel,
} from '@/schemas/recipe';
import RecipeBadge from './RecipeBadge';
import SearchHighlight from './SearchHighlight';
import RecipeThumbnail from './RecipeThumbnail';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

interface RecipeTableRowProps {
  recipe: RecipeListItem;
  searchQuery?: string;
  onDelete?: () => void;
  onClone?: () => void;
}

export default function RecipeTableRow({ recipe, searchQuery, onDelete, onClone }: RecipeTableRowProps) {
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel = getRecipeExecutionTimeLabel(recipe.execution_time);
  const costsLabel = recipe.cached_price_total != null
    ? `${formatNumber(recipe.cached_price_total, { maxDecimals: 2 }).replace('.', ',')} €`
    : '—';

  const isDraft = recipe.status === 'draft';

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <RecipeThumbnail
        imageUrl={recipe.image_url}
        title={recipe.title}
        size="sm"
        imgClassName="rounded-lg"
        className="rounded-lg"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-body line-clamp-2">
            <SearchHighlight text={recipe.title} query={searchQuery} />
          </span>
          {isDraft && (
            <RecipeBadge badge="draft" />
          )}
        </div>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1 text-caption text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
        <Icon name="schedule" size={16} />
        {timeLabel}
      </span>
      <span className="hidden md:inline-flex items-center gap-1 text-caption text-muted-foreground shrink-0">
        {difficultyLabel}
      </span>
      <span className="hidden md:inline-flex items-center gap-1 text-caption font-semibold text-danger shrink-0">
        <Icon name="favorite" size={16} />
        {recipe.like_score}
      </span>
      <span className="hidden md:inline-flex text-caption text-muted-foreground shrink-0 w-16 text-right">
        {costsLabel}
      </span>
      {(recipe.can_edit || recipe.can_delete || onClone) && (
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.preventDefault()}>
          {recipe.can_edit && (
            <Link
              to={`/recipes/${recipe.slug}`}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
              title="Bearbeiten"
            >
              <Icon name="edit" size={16} className="text-muted-foreground" />
            </Link>
          )}
          {recipe.can_delete && onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
              title="Löschen"
            >
              <Icon name="delete" size={16} className="text-destructive" />
            </button>
          )}
          {onClone && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClone(); }}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
              title="Rezept clonen"
            >
              <Icon name="content_copy" size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </Link>
  );
}
