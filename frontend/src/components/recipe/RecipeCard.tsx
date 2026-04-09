import { Link } from 'react-router-dom';
import type { RecipeListItem } from '@/schemas/recipe';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
} from '@/schemas/recipe';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';

interface RecipeCardProps {
  recipe: RecipeListItem;
  /** Whether the user can edit this item */
  canEdit?: boolean;
  /** Whether the user can delete this item */
  canDelete?: boolean;
  /** Callback when the edit icon is clicked */
  onEdit?: () => void;
  /** Callback when the delete icon is clicked */
  onDelete?: () => void;
}

export default function RecipeCard({ recipe, canEdit, canDelete, onEdit, onDelete }: RecipeCardProps) {
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel =
    RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === recipe.execution_time)?.label ??
    recipe.execution_time;
  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);

  const hasActions = (canEdit && onEdit) || (canDelete && onDelete);
  const nutriClass = recipe.cached_nutri_class;
  const nutriColors = nutriClass ? NUTRI_SCORE_COLORS[nutriClass] : null;

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border/50 hover:border-primary/40 hover:shadow-colorful"
    >
      {/* Image with gradient overlay */}
      <div className="relative overflow-hidden aspect-square">
        <img
          src={recipe.image_url || '/images/inspi_cook.png'}
          alt={recipe.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-amber-500/10" />
        {/* Like badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold text-rose-500 shadow-md">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          {recipe.like_score}
        </div>
        {/* Type badge */}
        {typeOpt && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold text-amber-600 shadow-md">
            <span className="material-symbols-outlined text-[14px]">{typeOpt.icon}</span>
            {typeOpt.label}
          </div>
        )}
        {/* Servings & Nutri-Score badges */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {nutriColors && (
            <div className={`flex items-center justify-center w-7 h-7 rounded-full ${nutriColors.bg} ${nutriColors.text} text-xs font-extrabold shadow-md`}>
              {nutriColors.label}
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-bold text-white">
              <span className="material-symbols-outlined text-[14px]">group</span>
              {recipe.servings}
            </div>
          )}
        </div>
        {/* Admin action icons */}
        {hasActions && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {canEdit && onEdit && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-foreground shadow-md hover:bg-white transition-colors"
                title="Bearbeiten"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-destructive shadow-md hover:bg-white transition-colors"
                title="Loeschen"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-extrabold text-base group-hover:text-primary transition-colors line-clamp-2">
          {recipe.title}
        </h3>

        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{recipe.summary}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {recipe.tags.slice(0, 3).map((tag, index) => {
            const tagColors = [
              'bg-primary/15 text-primary border border-primary/20',
              'bg-[hsl(174,60%,41%)]/15 text-[hsl(174,60%,41%)] border border-[hsl(174,60%,41%)]/20',
              'bg-accent/15 text-accent border border-accent/20',
              'bg-violet-500/15 text-violet-600 border border-violet-500/20',
              'bg-rose-500/15 text-rose-600 border border-rose-500/20',
            ];
            return (
              <span
                key={tag.id}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${tagColors[index % tagColors.length]}`}
              >
                {tag.icon && <span className="material-symbols-outlined text-[14px] mr-1">{tag.icon}</span>}
                {tag.name}
              </span>
            );
          })}
          {recipe.tags.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30 px-2.5 py-0.5 text-xs font-bold">
              +{recipe.tags.length - 3}
            </span>
          )}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-[hsl(174,60%,41%)]/10 rounded-full px-2.5 py-1">
            <span className="material-symbols-outlined text-[16px] text-[hsl(174,60%,41%)]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            {timeLabel}
          </span>
          <span className="flex items-center gap-1.5 bg-accent/10 rounded-full px-2.5 py-1">
            <span className="material-symbols-outlined text-[16px] text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>signal_cellular_alt</span>
            {difficultyLabel}
          </span>
          {recipe.cached_price_total != null && recipe.cached_price_total > 0 && (
            <span className="flex items-center gap-1.5 bg-amber-500/10 rounded-full px-2.5 py-1 ml-auto">
              <span className="material-symbols-outlined text-[16px] text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
              {recipe.cached_price_total.toFixed(2)} EUR
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
