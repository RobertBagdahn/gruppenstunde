import { Link } from 'react-router-dom';
import type { RecipeListItem } from '@/schemas/recipe';
import {
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
} from '@/schemas/recipe';
import RecipeBadge from './RecipeBadge';
import SearchHighlight from './SearchHighlight';
import RecipeThumbnail from './RecipeThumbnail';

interface RecipeTableRowProps {
  recipe: RecipeListItem;
  searchQuery?: string;
  onDelete?: () => void;
  onClone?: () => void;
}

export default function RecipeTableRow({ recipe, searchQuery, onDelete, onClone }: RecipeTableRowProps) {
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel =
    RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === recipe.execution_time)?.label ??
    recipe.execution_time;
  const costsLabel = recipe.cached_price_total != null
    ? `${recipe.cached_price_total.toFixed(2).replace('.', ',')} €`
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
          <span className="font-semibold text-sm line-clamp-2">
            <SearchHighlight text={recipe.title} query={searchQuery} />
          </span>
          {isDraft && (
            <RecipeBadge badge="draft" />
          )}
        </div>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
        <span className="material-symbols-outlined text-[12px]">schedule</span>
        {timeLabel}
      </span>
      <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        {difficultyLabel}
      </span>
      <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--chart-5))] shrink-0">
        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
        {recipe.like_score}
      </span>
      <span className="hidden md:inline-flex text-xs text-muted-foreground shrink-0 w-16 text-right">
        {costsLabel}
      </span>
      {(recipe.can_edit || recipe.can_delete || onClone) && (
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.preventDefault()}>
          {recipe.can_edit && (
            <Link
              to={`/recipes/${recipe.slug}`}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Bearbeiten"
            >
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">edit</span>
            </Link>
          )}
          {recipe.can_delete && onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Löschen"
            >
              <span className="material-symbols-outlined text-[16px] text-destructive">delete</span>
            </button>
          )}
          {onClone && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClone(); }}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Rezept clonen"
            >
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">content_copy</span>
            </button>
          )}
        </div>
      )}
    </Link>
  );
}
