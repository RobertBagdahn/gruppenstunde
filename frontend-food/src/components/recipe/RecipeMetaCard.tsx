import { UtensilsCrossed, User, Clock, Timer, BarChart2, Users, Eye, Heart, Calendar } from 'lucide-react';
import type { RecipeDetail } from '@/schemas/recipe';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_PREPARATION_TIME_OPTIONS,
} from '@/schemas/recipe';
import { cn } from '@/lib/utils';

const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

interface RecipeMetaCardProps {
  recipe: RecipeDetail;
  portions: number;
  totalPriceEur?: number | null;
  className?: string;
}

export default function RecipeMetaCard({ recipe, portions, totalPriceEur, className }: RecipeMetaCardProps) {
  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel =
    RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === recipe.execution_time)?.label ??
    recipe.execution_time;
  const prepTimeLabel =
    RECIPE_PREPARATION_TIME_OPTIONS.find((p) => p.value === recipe.preparation_time)?.label ??
    recipe.preparation_time ??
    'keine';
  const scoutLevelsLabel =
    recipe.scout_levels.length > 0
      ? recipe.scout_levels.map((l) => l.name).join(', ')
      : 'Für alle';

  const nutriLabel = recipe.cached_nutri_class != null
    ? ['A', 'B', 'C', 'D', 'E'][recipe.cached_nutri_class - 1]
    : null;
  const nutriColors = nutriLabel ? NUTRI_SCORE_COLORS[nutriLabel] : null;

  const authorLabel = recipe.authors && recipe.authors.length > 0
    ? recipe.authors.map((a) => a.display_name || a.scout_name).join(', ')
    : null;

  const createdAtLabel = recipe.created_at
    ? new Date(recipe.created_at).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const price = totalPriceEur ?? (recipe.cached_price_total
    ? recipe.cached_price_total * (portions / (recipe.portions ?? 1))
    : null);
  const formattedPrice = price != null
    ? `${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    : '— €';

  const metaItems = [
    { label: 'Kategorie', value: typeOpt?.label ?? 'Unbekannt', Icon: UtensilsCrossed },
    { label: 'Autor', value: authorLabel ?? 'Anonym', Icon: User },
    { label: 'Kochzeit', value: timeLabel, Icon: Clock },
    { label: 'Vorbereitung', value: prepTimeLabel, Icon: Timer },
    { label: 'Schwierigkeit', value: difficultyLabel, Icon: BarChart2 },
    { label: 'Altersgruppe', value: scoutLevelsLabel, Icon: Users },
    { label: 'Aufrufe', value: recipe.view_count.toString(), Icon: Eye },
    { label: 'Likes', value: recipe.like_score.toString(), Icon: Heart },
    ...(createdAtLabel ? [{ label: 'Erstellt am', value: createdAtLabel, Icon: Calendar }] : []),
  ];

  return (
    <div className={cn('bg-card rounded-xl border p-4 space-y-4 shadow-sm', className)}>
      {/* Header Row with Gesamtkosten & Nutri-Score */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Gesamtkosten</p>
          <p className="text-xl font-black text-foreground">{formattedPrice}</p>
        </div>
        {nutriLabel && nutriColors && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Nutri-Score</span>
            <span className={cn(nutriColors.bg, nutriColors.text, 'text-base font-black px-2.5 py-0.5 rounded-md shadow-sm')}>
              {nutriLabel}
            </span>
          </div>
        )}
      </div>

      {/* Grid with Compact Stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        {metaItems.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 min-w-0">
            <item.Icon className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                {item.label}
              </p>
              <p className="font-semibold text-foreground text-xs leading-snug truncate" title={item.value}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
