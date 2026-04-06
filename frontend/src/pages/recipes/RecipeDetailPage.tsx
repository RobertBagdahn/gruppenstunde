import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useRecipeBySlug,
  useRecipeComments,
  useCreateRecipeComment,
  useRecipeEmotion,
  useRecipeChecks,
  useRecipeHints,
  useRecipeNutriScore,
  useRecipeNutritionBreakdown,
} from '@/api/recipes';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_COSTS_OPTIONS,
  RECIPE_PREPARATION_TIME_OPTIONS,
  RECIPE_EMOTION_OPTIONS,
} from '@/schemas/recipe';
import type { RecipeItemNutrition } from '@/schemas/recipe';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorDisplay from '@/components/ErrorDisplay';

// Scout level colors
const SCOUT_LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Woelflinge: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  Jungpfadfinder: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  Pfadfinder: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  Rover: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
};

// Nutri-Score colors
const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} – Rezepte – Inspi` : 'Inspi – Rezepte';

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? '';
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute('content', prevDesc);
    };
  }, [title, description]);
}

// --- Collapsible Section Component ---
function AnalysisSection({
  icon,
  title,
  defaultOpen = false,
  children,
  accentColor = 'text-primary',
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-6 bg-card rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-5 text-left hover:bg-muted/50 transition-colors"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <span className={`material-symbols-outlined text-[18px] ${accentColor}`}>{icon}</span>
          {title}
        </h2>
        <span
          className={`material-symbols-outlined text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </section>
  );
}

// --- Macro Bar Component ---
function MacroBar({
  label,
  value,
  max,
  color,
  unit = 'g',
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value.toFixed(1)} {unit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: recipe, isLoading, error, refetch } = useRecipeBySlug(slug ?? '');
  const recipeId = recipe?.id ?? 0;

  const { data: comments } = useRecipeComments(recipeId);
  const createComment = useCreateRecipeComment(recipeId);
  const createEmotion = useRecipeEmotion(recipeId);
  const { data: checks } = useRecipeChecks(recipeId);
  const { data: nutriScore } = useRecipeNutriScore(recipeId);
  const { data: hints } = useRecipeHints(recipeId);
  const { data: nutritionBreakdown } = useRecipeNutritionBreakdown(recipeId);

  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [servingsMultiplier, setServingsMultiplier] = useState(1);

  useDocumentMeta(recipe?.title ?? '', recipe?.summary ?? '');

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container py-8">
        <ErrorDisplay
          error={error}
          title="Rezept nicht gefunden"
          onRetry={() => refetch()}
          onBack={() => navigate(-1)}
          backLabel="Zurueck"
        />
      </div>
    );
  }

  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel =
    RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === recipe.execution_time)?.label ??
    recipe.execution_time;
  const costsLabel =
    RECIPE_COSTS_OPTIONS.find((c) => c.value === recipe.costs_rating)?.label ?? recipe.costs_rating;
  const prepTimeLabel =
    RECIPE_PREPARATION_TIME_OPTIONS.find((p) => p.value === recipe.preparation_time)?.label ??
    recipe.preparation_time;

  // Group tags by parent
  const topicTags = recipe.tags.filter((t) => t.parent_name === 'Themen');

  // Nutrition helpers
  const nb = nutritionBreakdown;
  const topIngredientsByWeight = nb
    ? [...nb.items].sort((a, b) => b.weight_g - a.weight_g)
    : [];
  const topIngredientsByPrice = nb
    ? [...nb.items].filter((i) => i.price_eur !== null).sort((a, b) => (b.price_eur ?? 0) - (a.price_eur ?? 0))
    : [];
  const topIngredientsByCalories = nb
    ? [...nb.items].sort((a, b) => b.energy_kcal - a.energy_kcal)
    : [];

  return (
    <article className="container py-8 max-w-3xl">
      {/* Recipe Type Badge */}
      {typeOpt && (
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 uppercase tracking-wide bg-rose-50 rounded-full px-3 py-1 border border-rose-200 mb-3">
          <span className="material-symbols-outlined text-[16px]">{typeOpt.icon}</span>
          {typeOpt.label}
        </p>
      )}

      {/* Title + Edit */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{recipe.title}</h1>
        {recipe.can_edit && (
          <Link
            to={`/recipes/${recipe.slug}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors shrink-0"
            title="Rezept bearbeiten"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span className="hidden sm:inline">Bearbeiten</span>
          </Link>
        )}
      </div>

      {/* Hero Image */}
      <div className="mt-6 rounded-xl overflow-hidden shadow-soft">
        <img
          src={recipe.image_url || '/images/inspi_cook.png'}
          alt={recipe.title}
          className="w-full object-cover max-h-96"
        />
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {/* Scout Levels */}
        {recipe.scout_levels.length > 0 ? (
          <div className="flex flex-col items-center text-center gap-2 bg-rose-50 rounded-xl border border-rose-200 p-5">
            <span className="material-symbols-outlined text-3xl text-rose-600">groups</span>
            <div className="flex flex-wrap justify-center gap-1">
              {recipe.scout_levels.map((level) => {
                const colors = SCOUT_LEVEL_COLORS[level.name] ?? {
                  bg: 'bg-muted',
                  border: 'border-border',
                  text: 'text-foreground',
                };
                return (
                  <span
                    key={level.id}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.border} ${colors.text} border`}
                  >
                    {level.name}
                  </span>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">Altersgruppe</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-5">
            <span className="material-symbols-outlined text-3xl text-rose-600">groups</span>
            <span className="text-base font-bold">Fuer alle</span>
            <span className="text-xs text-muted-foreground">Altersgruppe</span>
          </div>
        )}

        {/* Servings */}
        <div className="flex flex-col items-center text-center gap-1 bg-emerald-50 rounded-xl border border-emerald-200 p-5">
          <span className="material-symbols-outlined text-3xl text-emerald-600">group</span>
          <span className="text-base font-bold">{recipe.servings ?? '–'}</span>
          <span className="text-xs text-muted-foreground">Portionen</span>
        </div>

        {/* Views */}
        <div className="flex flex-col items-center text-center gap-1 bg-violet-50 rounded-xl border border-violet-200 p-5">
          <span className="material-symbols-outlined text-3xl text-violet-600">visibility</span>
          <span className="text-base font-bold">{recipe.view_count}</span>
          <span className="text-xs text-muted-foreground">Aufrufe</span>
        </div>

        {/* Like Score */}
        <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-5">
          <span
            className="material-symbols-outlined text-3xl text-rose-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          <span className="text-base font-bold">{recipe.like_score}</span>
          <span className="text-xs text-muted-foreground">Likes</span>
        </div>
      </div>

      {/* Summary */}
      {recipe.summary && (
        <div className="mt-6 bg-card rounded-xl border p-5">
          <MarkdownRenderer content={recipe.summary} className="text-lg font-semibold italic" />
        </div>
      )}

      {/* Authors */}
      {recipe.authors && recipe.authors.length > 0 && (
        <section className="mt-6 bg-card rounded-xl border p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            <span className="material-symbols-outlined text-[18px]">person</span>
            {recipe.authors.length === 1 ? 'Autor' : 'Autoren'}
          </h2>
          <div className="flex flex-wrap gap-3">
            {recipe.authors?.map((author, idx) => {
              const inner = (
                <div className="flex items-center gap-3">
                  {author.profile_picture_url ? (
                    <img
                      src={author.profile_picture_url}
                      alt={author.display_name}
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 border flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        person
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium">{author.display_name}</span>
                </div>
              );

              if (author.is_registered && author.id) {
                return (
                  <Link
                    key={author.id}
                    to={`/user/${author.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={idx} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Topic Tags */}
      {topicTags.length > 0 && (
        <section className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[18px]">label</span>
            Themen
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {topicTags.map((tag, idx) => {
              const colors = [
                'bg-primary/10 text-primary border-primary/30 hover:bg-primary hover:text-white',
                'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white',
                'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-600 hover:text-white',
                'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white',
                'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white',
                'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-600 hover:text-white',
                'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-600 hover:text-white',
                'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white',
              ];
              const sizes = ['text-sm px-3 py-1', 'text-base px-4 py-1.5', 'text-lg px-5 py-2'];
              const sizeIdx = (tag.name.length + idx) % sizes.length;
              const colorIdx = idx % colors.length;
              return (
                <Link
                  key={tag.id}
                  to={`/recipes?tag_slugs=${tag.slug}`}
                  className={`rounded-full border font-medium transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-105 ${sizes[sizeIdx]} ${colors[colorIdx]}`}
                >
                  {tag.icon && (
                    <span className="material-symbols-outlined text-[14px] mr-1 align-middle">
                      {tag.icon}
                    </span>
                  )}
                  {tag.name}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* KPI Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-5">
          <span className="material-symbols-outlined text-3xl text-rose-600">signal_cellular_alt</span>
          <span className="text-base font-bold">{difficultyLabel}</span>
          <span className="text-xs text-muted-foreground">Schwierigkeit</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-teal-50 rounded-xl border border-teal-200 p-5">
          <span className="material-symbols-outlined text-3xl text-teal-600">timer</span>
          <span className="text-base font-bold">{timeLabel}</span>
          <span className="text-xs text-muted-foreground">Kochzeit</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-yellow-50 rounded-xl border border-yellow-200 p-5">
          <span className="material-symbols-outlined text-3xl text-yellow-600">euro</span>
          <span className="text-base font-bold">{costsLabel}</span>
          <span className="text-xs text-muted-foreground">Kosten pro Person</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <span className="material-symbols-outlined text-3xl text-indigo-600">pending_actions</span>
          <span className="text-base font-bold">{prepTimeLabel}</span>
          <span className="text-xs text-muted-foreground">Vorbereitungszeit</span>
        </div>
      </div>

      {/* Nutri-Score */}
      {nutriScore && (
        <div className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[18px]">health_and_safety</span>
            Nutri-Score
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {['A', 'B', 'C', 'D', 'E'].map((grade) => {
                const isActive = nutriScore.nutri_label === grade;
                const colors = NUTRI_SCORE_COLORS[grade];
                return (
                  <div
                    key={grade}
                    className={`flex items-center justify-center font-bold rounded-lg transition-all ${
                      isActive
                        ? `${colors.bg} ${colors.text} w-12 h-12 text-xl shadow-lg scale-110`
                        : `${colors.bg}/20 text-muted-foreground w-10 h-10 text-sm opacity-40`
                    }`}
                  >
                    {grade}
                  </div>
                );
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Nutri-Score {nutriScore.nutri_label}
              </p>
              <p>
                {nutriScore.total_points} Punkte ({nutriScore.negative_points} negativ, {nutriScore.positive_points} positiv)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Checks (4-dimension assessment) */}
      {checks && checks.length > 0 && (
        <div className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[18px]">assessment</span>
            Bewertung
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {checks.map((check) => (
              <div
                key={check.label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border"
                style={{ borderColor: check.color + '40', backgroundColor: check.color + '10' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: check.color }}
                >
                  {check.score}
                </div>
                <span className="text-xs font-medium text-center">{check.label}</span>
                <span className="text-xs text-muted-foreground text-center">{check.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutritional Tags */}
      {recipe.nutritional_tags && recipe.nutritional_tags.length > 0 && (
        <section className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[18px]">nutrition</span>
            Allergene & Ernaehrungshinweise
          </h2>
          <div className="flex flex-wrap gap-2">
            {recipe.nutritional_tags?.map((nt) => (
              <span
                key={nt.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 text-sm font-medium"
              >
                {nt.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Recipe Items (Ingredients) - CLICKABLE */}
      <section className="mt-8 bg-card rounded-xl border p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <span className="material-symbols-outlined text-rose-500">egg_alt</span>
          Zutaten
          {recipe.servings && (
            <span className="text-sm font-normal text-muted-foreground">
              fuer {recipe.servings * servingsMultiplier} Portionen
            </span>
          )}
        </h2>

        {(recipe.recipe_items?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground italic">Keine Zutaten angegeben</p>
        ) : (
          <>
            {/* Servings multiplier */}
            {recipe.servings && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                <span className="material-symbols-outlined text-muted-foreground">group</span>
                <span className="text-sm font-medium">Portionen:</span>
                <button
                  onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                  className="w-8 h-8 rounded-lg border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={servingsMultiplier}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1) setServingsMultiplier(v);
                  }}
                  className="w-16 h-8 text-center rounded-lg border bg-background text-sm font-bold"
                />
                <button
                  onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                  className="w-8 h-8 rounded-lg border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            )}

            <ul className="space-y-2">
              {(recipe.recipe_items ?? [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => {
                  const qty = item.quantity * servingsMultiplier;
                  const displayQty = qty % 1 === 0 ? qty.toString() : qty.toFixed(1);

                  const ingredientContent = (
                    <>
                       <span className="material-symbols-outlined text-rose-500 text-[18px]">
                        check_circle
                      </span>
                      {item.quantity > 0 && (
                        <span className="font-semibold">{displayQty}</span>
                      )}
                      {item.measuring_unit_name && (
                        <span className="text-muted-foreground">{item.measuring_unit_name}</span>
                      )}
                      {item.portion_name && (
                        <span className="text-muted-foreground">{item.portion_name}</span>
                      )}
                      <span className="font-medium">{item.ingredient_name ?? 'Unbekannt'}</span>
                      {item.note && (
                        <span className="text-xs text-muted-foreground italic">({item.note})</span>
                      )}
                      {item.quantity_type === 'per_person' && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          pro Person
                        </span>
                      )}
                    </>
                  );

                  // Make ingredient clickable if it has an ingredient_id
                  if (item.ingredient_id) {
                    return (
                      <li key={item.id} className="text-sm">
                        <Link
                          to={`/ingredients/${item.ingredient_id}`}
                          className="flex items-center gap-2 p-2 -m-2 rounded-lg hover:bg-rose-50 hover:border-rose-200 transition-colors group"
                          title={`${item.ingredient_name} – Details anzeigen`}
                        >
                          {ingredientContent}
                          <span className="material-symbols-outlined text-[14px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            arrow_forward
                          </span>
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id} className="flex items-center gap-2 text-sm p-2 -m-2">
                      {ingredientContent}
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </section>

      {/* Description */}
      {recipe.description && (
        <div className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
            <span className="material-symbols-outlined text-primary">description</span>
            Zubereitung
          </h2>
          <MarkdownRenderer content={recipe.description} />
        </div>
      )}

      {/* Long Summary */}
      {recipe.summary_long && (
        <div className="mt-6 bg-card rounded-xl border p-6">
          <MarkdownRenderer content={recipe.summary_long} />
        </div>
      )}

      {/* ============================================================ */}
      {/* ANALYSIS SECTIONS (collapsible) */}
      {/* ============================================================ */}

      {/* --- Preis-Analyse --- */}
      {nb && nb.total_price_eur !== null && nb.total_price_eur > 0 && (
        <AnalysisSection icon="euro" title="Preis-Analyse" accentColor="text-yellow-600">
          <div className="space-y-6">
            {/* Price overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <p className="text-2xl font-extrabold text-yellow-700">
                  {nb.total_price_eur.toFixed(2)} EUR
                </p>
                <p className="text-xs text-muted-foreground mt-1">Gesamtpreis</p>
              </div>
              {recipe.servings && (
                <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-2xl font-extrabold text-emerald-700">
                    {(nb.total_price_eur / (recipe.servings * servingsMultiplier)).toFixed(2)} EUR
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">pro Portion</p>
                </div>
              )}
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-2xl font-extrabold text-blue-700">
                  {nb.items.filter((i) => i.price_eur !== null).length} / {nb.items.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Zutaten mit Preis</p>
              </div>
            </div>

            {/* Price breakdown table */}
            {topIngredientsByPrice.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Kosten nach Zutat</h3>
                <div className="space-y-2">
                  {topIngredientsByPrice.map((item) => (
                    <PriceRow
                      key={item.recipe_item_id}
                      item={item}
                      totalPrice={nb.total_price_eur ?? 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </AnalysisSection>
      )}

      {/* --- Inhaltsstoffanalyse (Nutritional Breakdown) --- */}
      {nb && nb.total_weight_g > 0 && (
        <AnalysisSection
          icon="science"
          title="Inhaltsstoffanalyse"
          accentColor="text-violet-600"
        >
          <div className="space-y-6">
            {/* Macro overview per serving */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Naehrwerte pro Portion{' '}
                <span className="font-normal text-muted-foreground">
                  ({Math.round(nb.total_weight_g / (recipe.servings || 1))} g)
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NutrientCard
                  label="Kalorien"
                  value={nb.per_serving_energy_kcal ?? 0}
                  unit="kcal"
                  icon="local_fire_department"
                  color="text-orange-600"
                  bgColor="bg-orange-50 border-orange-200"
                />
                <NutrientCard
                  label="Protein"
                  value={nb.per_serving_protein_g ?? 0}
                  unit="g"
                  icon="fitness_center"
                  color="text-red-600"
                  bgColor="bg-red-50 border-red-200"
                />
                <NutrientCard
                  label="Fett"
                  value={nb.per_serving_fat_g ?? 0}
                  unit="g"
                  icon="water_drop"
                  color="text-amber-600"
                  bgColor="bg-amber-50 border-amber-200"
                />
                <NutrientCard
                  label="Kohlenhydrate"
                  value={nb.per_serving_carbohydrate_g ?? 0}
                  unit="g"
                  icon="grain"
                  color="text-teal-600"
                  bgColor="bg-teal-50 border-teal-200"
                />
              </div>
            </div>

            {/* Macro bars (total) */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Gesamtnaehrwerte</h3>
              <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                <MacroBar
                  label="Protein"
                  value={nb.total_protein_g}
                  max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
                  color="bg-red-500"
                />
                <MacroBar
                  label="Fett"
                  value={nb.total_fat_g}
                  max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
                  color="bg-amber-500"
                />
                <MacroBar
                  label="davon gesaettigt"
                  value={nb.total_fat_sat_g}
                  max={nb.total_fat_g || 1}
                  color="bg-amber-300"
                />
                <MacroBar
                  label="Kohlenhydrate"
                  value={nb.total_carbohydrate_g}
                  max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
                  color="bg-teal-500"
                />
                <MacroBar
                  label="davon Zucker"
                  value={nb.total_sugar_g}
                  max={nb.total_carbohydrate_g || 1}
                  color="bg-teal-300"
                />
                <MacroBar
                  label="Ballaststoffe"
                  value={nb.total_fibre_g}
                  max={30}
                  color="bg-green-500"
                />
                <MacroBar
                  label="Salz"
                  value={nb.total_salt_g}
                  max={6}
                  color="bg-blue-500"
                />
              </div>
            </div>

            {/* Top calorie contributors */}
            {topIngredientsByCalories.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Kalorien nach Zutat</h3>
                <div className="space-y-2">
                  {topIngredientsByCalories.slice(0, 8).map((item) => (
                    <div key={item.recipe_item_id} className="flex items-center gap-3">
                      {item.ingredient_id ? (
                        <Link
                          to={`/ingredients/${item.ingredient_id}`}
                          className="text-sm font-medium hover:text-primary transition-colors w-32 truncate underline-offset-2 hover:underline"
                        >
                          {item.ingredient_name}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium w-32 truncate">
                          {item.ingredient_name}
                        </span>
                      )}
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{
                            width: `${nb.total_energy_kcal > 0 ? (item.energy_kcal / nb.total_energy_kcal) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {item.energy_kcal.toFixed(0)} kcal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AnalysisSection>
      )}

      {/* --- Gesundheitsanalyse --- */}
      {nutriScore && nb && nb.total_weight_g > 0 && (
        <AnalysisSection
          icon="health_and_safety"
          title="Gesundheitsanalyse"
          accentColor="text-green-600"
        >
          <div className="space-y-6">
            {/* Nutri-Score detail */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                  {['A', 'B', 'C', 'D', 'E'].map((grade) => {
                    const isActive = nutriScore.nutri_label === grade;
                    const colors = NUTRI_SCORE_COLORS[grade];
                    return (
                      <div
                        key={grade}
                        className={`flex items-center justify-center font-bold rounded-lg transition-all ${
                          isActive
                            ? `${colors.bg} ${colors.text} w-14 h-14 text-2xl shadow-lg scale-110`
                            : `${colors.bg}/20 text-muted-foreground w-10 h-10 text-sm opacity-30`
                        }`}
                      >
                        {grade}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gesamtpunkte: {nutriScore.total_points}
                </p>
              </div>
              <div className="flex-1 space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-700">Negative Punkte</span>
                    <span className="text-lg font-bold text-red-700">
                      {nutriScore.negative_points}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Energie, Zucker, gesaettigte Fettsaeuren, Natrium
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">Positive Punkte</span>
                    <span className="text-lg font-bold text-green-700">
                      {nutriScore.positive_points}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Ballaststoffe, Protein, Obst/Gemuese-Anteil
                  </p>
                </div>
              </div>
            </div>

            {/* Health indicators */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Gesundheitsindikatoren pro Portion</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <HealthIndicator
                  label="Zucker"
                  value={nb.total_sugar_g / (recipe.servings || 1)}
                  max={25}
                  unit="g"
                  goodBelow={10}
                  warnBelow={20}
                />
                <HealthIndicator
                  label="Ges. Fett"
                  value={nb.total_fat_sat_g / (recipe.servings || 1)}
                  max={20}
                  unit="g"
                  goodBelow={6}
                  warnBelow={13}
                />
                <HealthIndicator
                  label="Salz"
                  value={nb.total_salt_g / (recipe.servings || 1)}
                  max={6}
                  unit="g"
                  goodBelow={1.5}
                  warnBelow={3}
                />
                <HealthIndicator
                  label="Ballaststoffe"
                  value={nb.total_fibre_g / (recipe.servings || 1)}
                  max={10}
                  unit="g"
                  goodBelow={999}
                  warnBelow={999}
                  inverted
                />
                <HealthIndicator
                  label="Protein"
                  value={(nb.per_serving_protein_g ?? 0)}
                  max={50}
                  unit="g"
                  goodBelow={999}
                  warnBelow={999}
                  inverted
                />
                <HealthIndicator
                  label="Kalorien"
                  value={(nb.per_serving_energy_kcal ?? 0)}
                  max={800}
                  unit="kcal"
                  goodBelow={400}
                  warnBelow={600}
                />
              </div>
            </div>
          </div>
        </AnalysisSection>
      )}

      {/* --- Gewichtsanalyse --- */}
      {nb && nb.total_weight_g > 0 && topIngredientsByWeight.length > 0 && (
        <AnalysisSection
          icon="scale"
          title="Gewichtsanalyse"
          accentColor="text-indigo-600"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="material-symbols-outlined text-2xl text-indigo-600">scale</span>
              <div>
                <p className="text-lg font-bold text-indigo-700">
                  {nb.total_weight_g.toFixed(0)} g
                </p>
                <p className="text-xs text-muted-foreground">
                  Gesamtgewicht ({Math.round(nb.total_weight_g / (recipe.servings || 1))} g pro Portion)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {topIngredientsByWeight.map((item) => (
                <div key={item.recipe_item_id} className="flex items-center gap-3">
                  {item.ingredient_id ? (
                    <Link
                      to={`/ingredients/${item.ingredient_id}`}
                      className="text-sm font-medium hover:text-primary transition-colors w-32 truncate underline-offset-2 hover:underline"
                    >
                      {item.ingredient_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium w-32 truncate">
                      {item.ingredient_name}
                    </span>
                  )}
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${item.weight_pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {item.weight_g.toFixed(0)} g ({item.weight_pct.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnalysisSection>
      )}

      {/* --- Zubereitungsanalyse --- */}
      <AnalysisSection
        icon="restaurant"
        title="Zubereitungsanalyse"
        accentColor="text-teal-600"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="text-center p-4 bg-teal-50 rounded-xl border border-teal-200">
            <span className="material-symbols-outlined text-2xl text-teal-600">timer</span>
            <p className="text-base font-bold mt-1">{timeLabel}</p>
            <p className="text-xs text-muted-foreground">Kochzeit</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <span className="material-symbols-outlined text-2xl text-indigo-600">pending_actions</span>
            <p className="text-base font-bold mt-1">{prepTimeLabel}</p>
            <p className="text-xs text-muted-foreground">Vorbereitung</p>
          </div>
          <div className="text-center p-4 bg-rose-50 rounded-xl border border-rose-200">
            <span className="material-symbols-outlined text-2xl text-rose-600">signal_cellular_alt</span>
            <p className="text-base font-bold mt-1">{difficultyLabel}</p>
            <p className="text-xs text-muted-foreground">Schwierigkeit</p>
          </div>
          {recipe.servings && (
            <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="material-symbols-outlined text-2xl text-emerald-600">group</span>
              <p className="text-base font-bold mt-1">{recipe.servings}</p>
              <p className="text-xs text-muted-foreground">Portionen</p>
            </div>
          )}
          <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200">
            <span className="material-symbols-outlined text-2xl text-amber-600">egg_alt</span>
            <p className="text-base font-bold mt-1">{recipe.recipe_items?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Zutaten</p>
          </div>
          {nb && nb.total_weight_g > 0 && (
            <div className="text-center p-4 bg-violet-50 rounded-xl border border-violet-200">
              <span className="material-symbols-outlined text-2xl text-violet-600">scale</span>
              <p className="text-base font-bold mt-1">{nb.total_weight_g.toFixed(0)} g</p>
              <p className="text-xs text-muted-foreground">Gesamtgewicht</p>
            </div>
          )}
        </div>
      </AnalysisSection>

      {/* Recipe Hints */}
      {hints && hints.length > 0 && (
        <section className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[18px]">lightbulb</span>
            Verbesserungsvorschlaege
          </h2>
          <div className="space-y-3">
            {hints.map((match, idx) => {
              const levelColors: Record<string, string> = {
                info: 'bg-blue-50 border-blue-200 text-blue-700',
                warning: 'bg-amber-50 border-amber-200 text-amber-700',
                error: 'bg-red-50 border-red-200 text-red-700',
              };
              const levelIcons: Record<string, string> = {
                info: 'info',
                warning: 'warning',
                error: 'error',
              };
              const colorClass =
                levelColors[match.hint.hint_level] ?? levelColors.info;
              const icon = levelIcons[match.hint.hint_level] ?? 'info';
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${colorClass}`}
                >
                  <span className="material-symbols-outlined text-[20px] mt-0.5">{icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{match.hint.name}</p>
                    <p className="text-sm mt-0.5">{match.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Emotions */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <span className="material-symbols-outlined text-accent">mood</span>
          Wie findest du dieses Rezept?
        </h2>
        <div className="flex gap-3">
          {RECIPE_EMOTION_OPTIONS.map((opt) => {
            const count = recipe.emotion_counts?.[opt.value] ?? 0;
            const isSelected = recipe.user_emotion === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => createEmotion.mutate({ emotion_type: opt.value })}
                disabled={createEmotion.isPending}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border cursor-pointer hover:border-rose-500 hover:shadow-glow active:scale-95 transition-all ${
                  isSelected
                    ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
                    : 'bg-card'
                }`}
              >
                <span className={`text-3xl ${createEmotion.isPending ? 'opacity-50' : ''}`}>
                  {opt.emoji}
                </span>
                <span className="text-xs font-medium text-muted-foreground">{opt.label}</span>
                {count > 0 && (
                  <span
                    className={`text-xs font-bold ${isSelected ? 'text-rose-600' : 'text-muted-foreground'}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Similar Recipes */}
      {(recipe.next_best_recipes?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            Aehnliche Rezepte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recipe.next_best_recipes ?? []).map((similar) => (
              <Link
                key={similar.id}
                to={`/recipes/${similar.slug}`}
                className="group block rounded-xl bg-card border overflow-hidden hover:border-rose-500/40 hover:shadow-md transition-all"
              >
                <img
                  src={similar.image_url || '/images/inspi_cook.png'}
                  alt={similar.title}
                  loading="lazy"
                  className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-3">
                  <h3 className="font-semibold text-sm group-hover:text-rose-600 transition-colors line-clamp-2">
                    {similar.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {similar.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      {RECIPE_EXECUTION_TIME_OPTIONS.find((t) => t.value === similar.execution_time)
                        ?.label ?? similar.execution_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        signal_cellular_alt
                      </span>
                      {RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === similar.difficulty)
                        ?.label ?? similar.difficulty}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <span className="material-symbols-outlined text-primary">forum</span>
          Kommentare
        </h2>

        {/* Comment Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!commentText.trim()) return;
            createComment.mutate(
              {
                text: commentText.trim(),
                author_name: commentAuthor.trim() || undefined,
              },
              {
                onSuccess: () => {
                  setCommentText('');
                  setCommentAuthor('');
                },
              },
            );
          }}
          className="mb-6 space-y-3 bg-card rounded-xl border p-5"
        >
          <input
            type="text"
            placeholder="Dein Name (optional)"
            value={commentAuthor}
            onChange={(e) => setCommentAuthor(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <textarea
            placeholder="Schreibe einen Kommentar..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || createComment.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {createComment.isPending ? 'Wird gesendet...' : 'Kommentar senden'}
          </button>
          {createComment.isSuccess && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="material-symbols-outlined text-rose-500 text-[18px]">
                check_circle
              </span>
              Dein Kommentar wurde eingereicht und wird nach Pruefung angezeigt.
            </p>
          )}
        </form>

        {/* Comment List */}
        {comments && comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="material-symbols-outlined text-muted-foreground text-[18px]">
                      person
                    </span>
                    {comment.user_id ? (
                      <Link
                        to={`/profile/name/${comment.user_id}`}
                        className="text-rose-600 hover:underline"
                      >
                        {comment.author_name}
                      </Link>
                    ) : (
                      comment.author_name
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
                <p className="text-sm text-foreground/85">{comment.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
            Noch keine Kommentare. Sei der Erste!
          </p>
        )}
      </section>
    </article>
  );
}

// --- Helper Components ---

function NutrientCard({
  label,
  value,
  unit,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`text-center p-4 rounded-xl border ${bgColor}`}>
      <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
      <p className="text-xl font-extrabold mt-1">
        {value.toFixed(unit === 'kcal' ? 0 : 1)}
      </p>
      <p className="text-xs text-muted-foreground">
        {label} ({unit})
      </p>
    </div>
  );
}

function HealthIndicator({
  label,
  value,
  max,
  unit,
  goodBelow,
  warnBelow,
  inverted = false,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  goodBelow: number;
  warnBelow: number;
  inverted?: boolean;
}) {
  let status: 'good' | 'warn' | 'bad';
  if (inverted) {
    // Higher is better (fiber, protein)
    status = value >= goodBelow ? 'good' : value >= warnBelow ? 'warn' : 'good';
  } else {
    status = value <= goodBelow ? 'good' : value <= warnBelow ? 'warn' : 'bad';
  }

  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warn: 'bg-amber-50 border-amber-200 text-amber-700',
    bad: 'bg-red-50 border-red-200 text-red-700',
  };

  const statusIcons = {
    good: 'check_circle',
    warn: 'warning',
    bad: 'error',
  };

  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className={`p-3 rounded-xl border ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <span className="material-symbols-outlined text-[16px]">{statusIcons[status]}</span>
      </div>
      <p className="text-lg font-bold">
        {value.toFixed(1)} {unit}
      </p>
      <div className="h-1.5 bg-white/50 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full rounded-full ${status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PriceRow({
  item,
  totalPrice,
}: {
  item: RecipeItemNutrition;
  totalPrice: number;
}) {
  const pricePct = totalPrice > 0 && item.price_eur ? (item.price_eur / totalPrice) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {item.ingredient_id ? (
        <Link
          to={`/ingredients/${item.ingredient_id}`}
          className="text-sm font-medium hover:text-primary transition-colors w-32 truncate underline-offset-2 hover:underline"
        >
          {item.ingredient_name}
        </Link>
      ) : (
        <span className="text-sm font-medium w-32 truncate">{item.ingredient_name}</span>
      )}
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full"
          style={{ width: `${pricePct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-yellow-700 w-16 text-right">
        {item.price_eur?.toFixed(2)} EUR
      </span>
    </div>
  );
}
