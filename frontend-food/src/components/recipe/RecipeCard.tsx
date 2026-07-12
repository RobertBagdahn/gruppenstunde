import { Link } from 'react-router-dom';
import type { RecipeListItem } from '@/schemas/recipe';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
} from '@/schemas/recipe';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';
import RecipeBadge from './RecipeBadge';
import SearchHighlight from './SearchHighlight';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  'bg-primary/10 text-primary border border-primary/20',
  'bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3))]/20',
  'bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))] border border-[hsl(var(--chart-2))]/20',
  'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4))]/20',
  'bg-[hsl(var(--chart-5))]/10 text-[hsl(var(--chart-5))] border border-[hsl(var(--chart-5))]/20',
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
  const timeLabel =
    RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === recipe.execution_time)?.label ??
    recipe.execution_time;
  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);
  const costsLabel = recipe.cached_price_total != null
    ? `${recipe.cached_price_total.toFixed(2)} €`
    : null;

  const hasActions = (canEdit && onEdit) || (canDelete && onDelete) || onClone;
  const nutriClass = recipe.cached_nutri_class;
  const nutriColors = nutriClass ? NUTRI_SCORE_COLORS[nutriClass] : null;

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border hover:border-primary/40 hover:shadow-colorful"
    >
      {/* Image with gradient overlay */}
      <div className="relative overflow-hidden aspect-square">
        <img
          src={recipe.image_url || '/images/inspi_cook.png'}
          alt={recipe.title}
          loading="lazy"
          className={cn(
            "w-full h-full transition-transform duration-500 group-hover:scale-110",
            recipe.image_url ? "object-cover" : "object-contain p-4 bg-muted/30"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-amber-500/10" />
        {/* Like badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-[11px] font-extrabold text-[hsl(var(--chart-5))] shadow-md">
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          {recipe.like_score}
        </div>
        {/* Type badge */}
        {typeOpt && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-[11px] font-extrabold text-[hsl(var(--chart-2))] shadow-md">
            <span className="material-symbols-outlined text-[12px]">{typeOpt.icon}</span>
            {typeOpt.label}
          </div>
        )}
        {/* Nutri-Score & Recipe badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {recipe.recipe_badge && recipe.recipe_badge !== 'verified' && (
            <RecipeBadge badge={recipe.recipe_badge as 'draft' | 'verified' | 'community'} />
          )}
          {recipe.status === 'draft' && (
            <RecipeBadge badge="draft" />
          )}
          {nutriColors && (
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${nutriColors.bg} ${nutriColors.text} text-[10px] font-extrabold shadow-md`}>
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
                <span className="material-symbols-outlined text-[14px]">edit</span>
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
                <span className="material-symbols-outlined text-[14px]">delete</span>
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
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-extrabold text-sm group-hover:text-primary transition-colors truncate">
          <SearchHighlight text={recipe.title} query={searchQuery} />
        </h3>

        {recipe.summary && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            <SearchHighlight text={recipe.summary} query={searchQuery} />
          </p>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <span
                key={tag.id}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${TAG_COLORS[index % TAG_COLORS.length]}`}
              >
                {tag.icon && <span className="material-symbols-outlined text-[11px] mr-0.5">{tag.icon}</span>}
                {tag.name}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30 px-2 py-0.5 text-[10px] font-bold">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1 bg-[hsl(var(--chart-3))]/10 rounded-full px-2 py-0.5">
            <span className="material-symbols-outlined text-[13px] text-[hsl(var(--chart-3))]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            {timeLabel}
          </span>
          <span className="flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5">
            <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>signal_cellular_alt</span>
            {difficultyLabel}
          </span>
          {costsLabel && (
            <span className="flex items-center gap-1 bg-[hsl(var(--chart-2))]/10 rounded-full px-2 py-0.5">
              <span className="material-symbols-outlined text-[13px] text-[hsl(var(--chart-2))]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
              {costsLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
