import { toast } from 'sonner';
import PortionScaler from './PortionScaler';
import type { RecipeDetail } from '@/schemas/recipe';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_PREPARATION_TIME_OPTIONS,
} from '@/schemas/recipe';

const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

interface RecipeSidebarProps {
  recipe: RecipeDetail;
  recipeId: number;
  servings: number;
  onServingsChange: (servings: number) => void;
  onOpenShoppingList: () => void;
}

export default function RecipeSidebar({
  recipe,
  servings,
  onServingsChange,
  onOpenShoppingList,
}: RecipeSidebarProps) {
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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.title, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link kopiert');
    }
  };

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-80 sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
      {/* Hero Metadata */}
      <div className="bg-card rounded-xl border p-4 space-y-3">
        {typeOpt && (
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-rose-600">{typeOpt.icon}</span>
            <span className="text-sm font-medium text-rose-600">{typeOpt.label}</span>
          </div>
        )}
        {recipe.authors && recipe.authors.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="material-symbols-outlined text-[16px]">person</span>
            {recipe.authors.map((a) => a.display_name || a.scout_name).join(', ')}
          </div>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">timer</span>
            {timeLabel}
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">signal_cellular_alt</span>
            {difficultyLabel}
          </span>
        </div>
      </div>

      {/* Nutri-Score Badge */}
      {nutriLabel && nutriColors && (
        <div className="flex flex-col items-center gap-2 bg-card rounded-xl border p-4">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Nutri-Score</span>
          <span className={`${nutriColors.bg} ${nutriColors.text} text-2xl font-extrabold px-5 py-2 rounded-md`}>
            {nutriLabel}
          </span>
        </div>
      )}

      {/* Total Price KPI */}
      {recipe.cached_price_total != null && (
        <div className="flex flex-col items-center gap-1 bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <span className="material-symbols-outlined text-2xl text-yellow-600">euro</span>
          <span className="text-lg font-bold">
            {(recipe.cached_price_total * (servings / (recipe.servings ?? 1))).toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} €
          </span>
          <span className="text-xs text-muted-foreground">Gesamtkosten</span>
        </div>
      )}

      {/* Compact Stats Tiles */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-3">
          <span className="material-symbols-outlined text-2xl text-rose-600">groups</span>
          <span className="text-sm font-bold leading-tight">{scoutLevelsLabel}</span>
          <span className="text-[11px] text-muted-foreground">Altersgruppe</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-3">
          <span className="material-symbols-outlined text-2xl text-rose-600">signal_cellular_alt</span>
          <span className="text-sm font-bold leading-tight">{difficultyLabel}</span>
          <span className="text-[11px] text-muted-foreground">Schwierigkeit</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-teal-50 rounded-xl border border-teal-200 p-3">
          <span className="material-symbols-outlined text-2xl text-teal-600">timer</span>
          <span className="text-sm font-bold leading-tight">{timeLabel}</span>
          <span className="text-[11px] text-muted-foreground">Kochzeit</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-indigo-50 rounded-xl border border-indigo-200 p-3">
          <span className="material-symbols-outlined text-2xl text-indigo-600">pending_actions</span>
          <span className="text-sm font-bold leading-tight">{prepTimeLabel}</span>
          <span className="text-[11px] text-muted-foreground">Vorbereitungszeit</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-violet-50 rounded-xl border border-violet-200 p-3">
          <span className="material-symbols-outlined text-2xl text-violet-600">visibility</span>
          <span className="text-sm font-bold leading-tight">{recipe.view_count}</span>
          <span className="text-[11px] text-muted-foreground">Aufrufe</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-3">
          <span
            className="material-symbols-outlined text-2xl text-rose-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          <span className="text-sm font-bold leading-tight">{recipe.like_score}</span>
          <span className="text-[11px] text-muted-foreground">Likes</span>
        </div>
      </div>

      {/* Portion Scaler (compact) */}
      <PortionScaler
        defaultServings={servings}
        onChange={onServingsChange}
        compact
      />

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('mode', 'cooking');
            url.searchParams.set('step', '0');
            window.location.href = url.toString();
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">skillet</span>
          Kochen starten
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          Drucken
        </button>
        <button
          type="button"
          onClick={onOpenShoppingList}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
          Einkaufsliste
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          Teilen
        </button>
      </div>
    </aside>
  );
}
