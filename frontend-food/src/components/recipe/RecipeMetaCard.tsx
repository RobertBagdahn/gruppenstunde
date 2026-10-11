import { UtensilsCrossed, User, Clock, Timer, BarChart2, Users, Calendar } from 'lucide-react';
import type { RecipeDetail } from '@/schemas/recipe';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  getRecipeExecutionTimeLabel,
  RECIPE_PREPARATION_TIME_OPTIONS,
} from '@/schemas/recipe';
import { cn } from '@/lib/utils';

interface RecipeMetaCardProps {
  recipe: RecipeDetail;
  className?: string;
}

/**
 * "Steckbrief": the recipe's facts as a calm definition list (Feldküche).
 * Costs, Nutri-Score, views and likes live in RecipeKeyFigures.
 */
export default function RecipeMetaCard({ recipe, className }: RecipeMetaCardProps) {
  const typeOpt = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type);
  const difficultyLabel =
    RECIPE_DIFFICULTY_OPTIONS.find((d) => d.value === recipe.difficulty)?.label ?? recipe.difficulty;
  const timeLabel = getRecipeExecutionTimeLabel(recipe.execution_time);
  const prepTimeLabel =
    RECIPE_PREPARATION_TIME_OPTIONS.find((p) => p.value === recipe.preparation_time)?.label ??
    recipe.preparation_time ??
    'keine';
  const scoutLevelsLabel =
    recipe.scout_levels.length > 0 ? recipe.scout_levels.map((l) => l.name).join(', ') : 'Für alle';

  const authorLabel =
    recipe.authors && recipe.authors.length > 0
      ? recipe.authors.map((a) => a.display_name || a.scout_name).join(', ')
      : null;

  const createdAtLabel = recipe.created_at
    ? new Date(recipe.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const facts = [
    { label: 'Kategorie', value: typeOpt?.label ?? 'Unbekannt', Icon: UtensilsCrossed },
    { label: 'Autor', value: authorLabel ?? 'Anonym', Icon: User },
    { label: 'Kochzeit', value: timeLabel, Icon: Clock },
    { label: 'Vorbereitung', value: prepTimeLabel, Icon: Timer },
    { label: 'Schwierigkeit', value: difficultyLabel, Icon: BarChart2 },
    { label: 'Altersgruppe', value: scoutLevelsLabel, Icon: Users },
    ...(createdAtLabel ? [{ label: 'Erstellt am', value: createdAtLabel, Icon: Calendar }] : []),
  ];

  return (
    <section aria-labelledby="recipe-facts-heading" className={cn('rounded-xl bg-card p-5 shadow-card', className)}>
      <h2 id="recipe-facts-heading" className="mb-2 font-display text-section font-extrabold">
        Steckbrief
      </h2>
      <dl className="divide-y divide-border">
        {facts.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="flex items-center gap-2.5 text-body text-muted-foreground">
              <item.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </dt>
            <dd className="min-w-0 truncate text-right text-body font-bold text-foreground" title={item.value}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
