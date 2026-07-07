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
  isLoading?: boolean;
  className?: string;
}

export default function RecipeMetaCard({ recipe, portions, totalPriceEur, isLoading = false, className }: RecipeMetaCardProps) {
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
  const pricePerPortion = price != null && portions > 0
    ? price / portions
    : null;
  const formattedPricePerPortion = pricePerPortion != null
    ? `${pricePerPortion.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/Portion`
    : null;

  // Separate recipe facts from statistics
  const recipeFacts = [
    { label: 'Kategorie', value: typeOpt?.label ?? 'Unbekannt', Icon: UtensilsCrossed },
    { label: 'Autor', value: authorLabel ?? 'Anonym', Icon: User },
    { label: 'Kochzeit', value: timeLabel, Icon: Clock },
    { label: 'Vorbereitung', value: prepTimeLabel, Icon: Timer },
    { label: 'Schwierigkeit', value: difficultyLabel, Icon: BarChart2 },
    { label: 'Altersgruppe', value: scoutLevelsLabel, Icon: Users },
  ];

  const statistics = [
    { label: 'Aufrufe', value: recipe.view_count.toString(), Icon: Eye },
    { label: 'Likes', value: recipe.like_score.toString(), Icon: Heart },
  ];

  return (
    <div className={cn('bg-card rounded-2xl border p-5 space-y-5 shadow-sm', className)}>
      {/* Header Row with Gesamtkosten & Nutri-Score */}
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Gesamtkosten</p>
          {isLoading ? (
            <>
              <div className="h-9 bg-muted/60 rounded animate-pulse mb-2 w-24" />
              <div className="h-3 bg-muted/40 rounded animate-pulse w-20" />
            </>
          ) : (
            <>
              <p className="text-3xl font-black text-foreground tracking-tight">{formattedPrice}</p>
              {formattedPricePerPortion && (
                <p className="text-xs text-muted-foreground mt-1">{formattedPricePerPortion}</p>
              )}
            </>
          )}
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nutri-Score</p>
            <div className="w-10 h-10 bg-muted/60 rounded-full animate-pulse" />
          </div>
        ) : (
          nutriLabel && nutriColors && (
            <div className="flex flex-col items-center gap-1.5" title={`Nutri-Score ${nutriLabel}: ${['Hervorragend', 'Gut', 'Ausreichend', 'Mäßig', 'Schlecht'][recipe.cached_nutri_class! - 1]}`}>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nutri-Score</span>
              <span className={cn(nutriColors.bg, nutriColors.text, 'flex items-center justify-center w-10 h-10 text-xl font-black rounded-full shadow-sm cursor-help')}>
                {nutriLabel}
              </span>
            </div>
          )
        )}
      </div>

      {/* Grid with Compact Stats - Recipe Facts (2 cols) */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        {recipeFacts.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
              <item.Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-1.5">
                {item.label}
              </p>
              <p className="font-semibold text-foreground text-sm leading-snug truncate" title={item.value}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Grid with Statistics (2 cols) */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        {statistics.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <item.Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-1.5">
                {item.label}
              </p>
              <p className="font-semibold text-foreground text-sm leading-snug truncate" title={item.value}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Created At - dimmed */}
      {createdAtLabel && (
        <>
          <div className="border-t" />
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 shrink-0">
              <Calendar className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wide leading-none mb-1.5">
                Erstellt am
              </p>
              <p className="font-semibold text-foreground/60 text-sm leading-snug truncate" title={createdAtLabel}>
                {createdAtLabel}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
