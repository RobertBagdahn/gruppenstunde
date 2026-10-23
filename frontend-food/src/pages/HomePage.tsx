import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useFoodDashboard } from '@/api/dashboard';
import { useCurrentUser } from '@/api/auth';
import { useMealPlans } from '@/api/mealPlans';
import { useRecipes } from '@/api/recipes';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import RecipeCard from '@/components/recipe/RecipeCard';
import { formatCount, formatNumber } from '@/lib/format';
import type { MealPlan } from '@/schemas/mealPlan';

interface ModuleTile {
  key: 'recipes' | 'meal-plans' | 'shopping' | 'ingredients';
  label: string;
  icon: string;
  href: string;
  description: string;
}

const MODULE_TILES: readonly ModuleTile[] = [
  { key: 'recipes', label: 'Rezepte', icon: 'menu_book', href: '/recipes', description: 'Rezepte finden, anlegen und mit Nährwerten rechnen.' },
  { key: 'meal-plans', label: 'Essenspläne', icon: 'restaurant_menu', href: '/meal-plans/app', description: 'Mahlzeiten für Lager und Fahrten planen.' },
  { key: 'shopping', label: 'Einkaufslisten', icon: 'shopping_cart', href: '/shopping-lists', description: 'Gemeinsam abhaken, sortiert nach Abteilung.' },
  { key: 'ingredients', label: 'Zutaten', icon: 'egg', href: '/ingredients', description: 'Nährwerte, Preise und Portionen.' },
];

const STEPS = [
  { title: 'Rezepte auswählen', text: 'Nach Kategorie, Zeit und Kosten filtern.' },
  { title: 'Plan bauen', text: 'Tage füllen, Budget und kcal rechnen mit.' },
  { title: 'Einkaufen und kochen', text: 'Fertige Liste und Kochmodus.' },
] as const;

/** Upcoming or unfinished plan: the first one whose end is not in the past. */
function nextPlan(plans: MealPlan[] | undefined): MealPlan | null {
  if (!plans) return null;
  const now = Date.now();
  return plans.find((plan) => !plan.end_datetime || new Date(plan.end_datetime).getTime() >= now) ?? null;
}

function formatPeriod(plan: MealPlan): string {
  if (!plan.start_datetime) return 'Ohne Termin';
  const start = new Date(plan.start_datetime).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  if (!plan.end_datetime) return start;
  const end = new Date(plan.end_datetime).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return start === end ? start : `${start} – ${end}`;
}

function ModuleCount({ tile, data, isLoading, failed }: { tile: ModuleTile; data: ReturnType<typeof useFoodDashboard>['data']; isLoading: boolean; failed: boolean }) {
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  if (failed || !data) return <span className="text-caption text-muted-foreground">Zahl nicht verfügbar</span>;
  switch (tile.key) {
    case 'recipes':
      return <span className="text-caption text-muted-foreground tabular-nums">{formatCount(data.recipe_count)} Rezepte</span>;
    case 'meal-plans':
      return <span className="text-caption text-muted-foreground tabular-nums">{formatCount(data.active_meal_plan_count)} aktiv</span>;
    case 'shopping':
      return <span className="text-caption text-muted-foreground tabular-nums">{formatCount(data.open_shopping_list_count)} offen</span>;
    case 'ingredients':
      return <span className="text-caption text-muted-foreground tabular-nums">{formatCount(data.ingredient_count)} Einträge</span>;
  }
}

export default function HomePage() {
  const dashboard = useFoodDashboard();
  const { data: user } = useCurrentUser();
  const loggedIn = Boolean(user);

  const plansQuery = useMealPlans({ origin: 'mine', sort: 'date_upcoming' }, { enabled: loggedIn });
  const plan = useMemo(() => nextPlan(plansQuery.data), [plansQuery.data]);

  const popularQuery = useRecipes({ sort: 'popular', page: 1, page_size: 4 });
  const popular = popularQuery.data?.items ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 md:space-y-12 md:py-8 lg:px-8">
      {/* Introduction: one H1, a short description and two actions (food-homepage). */}
      <section className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl space-y-4">
          <h1 className="font-display text-display font-extrabold text-foreground">Was kocht ihr als Nächstes?</h1>
          <p className="text-emphasis text-muted-foreground md:text-section">
            Rezepte, Essenspläne und Einkaufslisten für jede Gruppenstunde, Fahrt und jedes Lager.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={loggedIn ? '/meal-plans/new' : '/login'}
              className="press inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-emphasis font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
            >
              <Icon name="calendar_month" size={20} aria-hidden="true" />
              Essensplan erstellen
            </Link>
            <Link
              to="/recipes"
              className="press inline-flex h-12 items-center gap-2 rounded-lg bg-primary-soft px-5 text-emphasis font-bold text-primary-dark transition-colors hover:bg-primary-soft-border"
            >
              <Icon name="menu_book" size={20} aria-hidden="true" />
              Rezepte entdecken
            </Link>
          </div>
        </div>
        <img src="/images/inspi_thinking.webp" alt="" aria-hidden="true" className="hidden h-40 w-auto shrink-0 md:block lg:h-48" />
      </section>

      {/* Module tiles with their counts (two columns on phones, four from 1024 px). */}
      <section aria-label="Bereiche" className="grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
        {MODULE_TILES.map((tile) => (
          <Link
            key={tile.key}
            to={tile.href}
            className="card-hover group flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card md:p-5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary-dark">
              <Icon name={tile.icon} size={24} aria-hidden="true" />
            </span>
            <span className="font-display text-emphasis font-bold text-foreground group-hover:text-primary-dark">{tile.label}</span>
            <ModuleCount tile={tile} data={dashboard.data} isLoading={dashboard.isLoading} failed={dashboard.isError} />
            <span className="hidden text-body text-muted-foreground md:block">{tile.description}</span>
          </Link>
        ))}
      </section>

      {/* Continue planning: only from the existing plan list, only for signed-in users with a plan. */}
      {loggedIn && plan && (
        <section aria-labelledby="weiter-planen" className="rounded-xl bg-card p-5 shadow-card md:p-6">
          <h2 id="weiter-planen" className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Weiter planen
          </h2>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-heading font-bold text-foreground [overflow-wrap:anywhere]">{plan.name}</p>
              <p className="text-body text-muted-foreground">
                {formatPeriod(plan)} · {formatCount(plan.norm_portions)} Personen
              </p>
              <p className="mt-2 text-body font-semibold tabular-nums text-foreground">
                {formatCount(plan.filled_meals_count)} von {formatCount(plan.meals_count)} Mahlzeiten
              </p>
              <div className="mt-2 h-2 w-64 max-w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${plan.meals_count ? Math.round((plan.filled_meals_count / plan.meals_count) * 100) : 0}%` }}
                />
              </div>
            </div>
            <Link
              to={`/meal-plans/${plan.id}`}
              className="press inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-body font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
            >
              Zum Essensplan
              <Icon name="chevron_right" size={20} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {/* How it works: three steps from the product's own flow. */}
      <section aria-labelledby="so-funktionierts" className="space-y-4">
        <h2 id="so-funktionierts" className="font-display text-heading font-bold text-foreground">
          So funktioniert’s
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-xl bg-card p-4 shadow-card">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spice font-bold text-white" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <p className="text-body font-semibold text-foreground">{step.title}</p>
                <p className="text-body text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Popular recipes from the existing sort; the whole row is left out without data. */}
      {popular.length > 0 && (
        <section aria-labelledby="beliebt" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h2 id="beliebt" className="font-display text-heading font-bold text-foreground">
              Beliebt
            </h2>
            <Link to="/recipes" className="press inline-flex min-h-11 items-center text-body font-semibold text-primary-dark hover:underline">
              Alle Rezepte
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {popular.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} popular />
              </li>
            ))}
          </ul>
        </section>
      )}

      {dashboard.data?.insights && dashboard.data.insights.total_meal_days_planned > 0 && (
        <p className="text-body text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{formatNumber(dashboard.data.insights.total_meal_days_planned, { maxDecimals: 0 })}</span>{' '}
          Tage mit Mahlzeiten geplant · im Schnitt {formatNumber(dashboard.data.insights.avg_ingredients_per_recipe)} Zutaten pro Rezept
        </p>
      )}
    </div>
  );
}
