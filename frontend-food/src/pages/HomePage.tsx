import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useFoodDashboard } from '@/api/dashboard';
import { useCurrentUser } from '@/api/auth';
import { useMealPlans } from '@/api/mealPlans';
import { useRecipes } from '@/api/recipes';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import RecipeCard from '@/components/recipe/RecipeCard';
import RecipeTypeTag from '@/components/recipe/RecipeTypeTag';
import Sticker from '@/components/shared/Sticker';
import { StickerBoundary } from '@/components/shared/StickerBoundary';
import { formatCount, formatEuro, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
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

/** Recipe types shown as tags on the Rezepte tile (category tints belong to recipe types only). */
const RECIPE_TAG_TYPES = ['warm_meal', 'cold_meal', 'dessert'] as const;
/** Plan settings shown as neutral tags on the Essenspläne tile (labels as used in the plan form). */
const PLAN_TAG_LABELS = ['Zeltlager', 'Wanderung', 'Gruppenstunde'] as const;

const STEPS = [
  { title: 'Rezepte auswählen', text: 'Nach Kategorie, Zeit und Kosten filtern.', badge: 'bg-spice' },
  { title: 'Plan bauen', text: 'Tage füllen, Budget und kcal rechnen mit.', badge: 'bg-primary' },
  { title: 'Einkaufen und kochen', text: 'Fertige Liste und Kochmodus.', badge: 'bg-primary-dark' },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Relative start label ("in 5 Tagen", "morgen", "heute"); null for past or undated plans. */
function startsIn(plan: MealPlan): string | null {
  if (!plan.start_datetime) return null;
  const days = Math.ceil((new Date(plan.start_datetime).getTime() - Date.now()) / DAY_MS);
  if (days > 1) return `in ${days} Tagen`;
  if (days === 1) return 'morgen';
  if (days === 0) return 'heute';
  return null;
}

function ModuleCount({ tile, data, isLoading, failed }: { tile: ModuleTile; data: ReturnType<typeof useFoodDashboard>['data']; isLoading: boolean; failed: boolean }) {
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  if (failed || !data) return <span className="text-caption text-muted-foreground">Zahl nicht verfügbar</span>;
  switch (tile.key) {
    case 'recipes':
      return <span className="text-caption font-bold tabular-nums text-primary-dark">{formatCount(data.recipe_count)} Rezepte</span>;
    case 'meal-plans':
      return <span className="text-caption font-bold tabular-nums text-primary-dark">{formatCount(data.active_meal_plan_count)} aktiv</span>;
    case 'shopping':
      return <span className="text-caption font-bold tabular-nums text-primary-dark">{formatCount(data.open_shopping_list_count)} offen</span>;
    case 'ingredients':
      return <span className="text-caption font-bold tabular-nums text-primary-dark">{formatCount(data.ingredient_count)} Einträge</span>;
  }
}

/** Tags on the desktop tiles only; the phone tiles stay compact. */
function ModuleTags({ tile }: { tile: ModuleTile }) {
  if (tile.key === 'recipes') {
    return (
      <div className="hidden flex-wrap gap-1.5 md:flex">
        {RECIPE_TAG_TYPES.map((type) => (
          <RecipeTypeTag key={type} type={type} />
        ))}
      </div>
    );
  }
  if (tile.key === 'meal-plans') {
    return (
      <div className="hidden flex-wrap gap-1.5 md:flex">
        {PLAN_TAG_LABELS.map((label) => (
          <span key={label} className="rounded-full bg-primary-soft px-2.5 py-1 text-caption font-semibold text-primary-dark">
            {label}
          </span>
        ))}
      </div>
    );
  }
  return null;
}

export default function HomePage() {
  const dashboard = useFoodDashboard();
  const { data: user } = useCurrentUser();
  const loggedIn = Boolean(user);

  const plansQuery = useMealPlans({ origin: 'mine', sort: 'date_upcoming' }, { enabled: loggedIn });
  const plan = useMemo(() => nextPlan(plansQuery.data), [plansQuery.data]);

  const popularQuery = useRecipes({ sort: 'popular', page: 1, page_size: 4 });
  const popular = popularQuery.data?.items ?? [];

  const planProgress = plan?.meals_count ? Math.round((plan.filled_meals_count / plan.meals_count) * 100) : 0;
  const planStart = plan ? startsIn(plan) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 md:space-y-12 md:py-8 lg:px-8">
      {/* Hero band: one H1, a short description, two actions and the mascot (food-homepage, Canvas-Layout). */}
      <section className="relative flex flex-col items-start gap-6 overflow-hidden rounded-xl bg-primary-soft p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-8">
        <div className="max-w-2xl space-y-4">
          <StickerBoundary>
            <Sticker>Für Gruppenstunde, Fahrt &amp; Lager</Sticker>
          </StickerBoundary>
          <h1 className="font-display text-display font-extrabold text-primary-dark">Was kocht ihr als Nächstes?</h1>
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
              className="press inline-flex h-12 items-center gap-2 rounded-lg border border-primary-soft-border bg-card px-5 text-emphasis font-bold text-primary-dark transition-colors hover:bg-primary-soft"
            >
              <Icon name="menu_book" size={20} aria-hidden="true" />
              Rezepte entdecken
            </Link>
          </div>
        </div>
        <img src="/images/inspi_thinking.webp" alt="" aria-hidden="true" className="hidden h-40 w-auto shrink-0 md:block lg:h-48" />
      </section>

      {/* Area tiles with counts and tags: neutral surfaces, no category tints (only recipe types are tinted). */}
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
            <span className="font-display text-emphasis font-bold text-foreground">{tile.label}</span>
            <ModuleCount tile={tile} data={dashboard.data} isLoading={dashboard.isLoading} failed={dashboard.isError} />
            <span className="hidden text-body text-muted-foreground md:block">{tile.description}</span>
            <ModuleTags tile={tile} />
          </Link>
        ))}
      </section>

      {/* Continue planning: only from the existing plan list, only for signed-in users with a plan. */}
      {loggedIn && plan && (
        <section aria-labelledby="weiter-planen" className="rounded-xl bg-primary-soft p-5 shadow-raised md:p-7">
          <h2 id="weiter-planen" className="text-caption font-bold uppercase tracking-wide text-primary">
            Weiter planen
          </h2>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-heading font-bold text-foreground [overflow-wrap:anywhere]">{plan.name}</p>
                {planStart && (
                  <span className="rounded-full bg-card px-2.5 py-1 text-caption font-bold text-primary-dark">{planStart}</span>
                )}
              </div>
              <p className="text-body text-muted-foreground">
                {formatPeriod(plan)} · {formatCount(plan.norm_portions)} Personen
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="flex min-w-[6rem] flex-col gap-0.5 rounded-lg bg-card px-3 py-2">
                  <span className="text-caption font-bold uppercase tracking-wider text-primary-dark">Mahlzeiten</span>
                  <span className="font-display text-emphasis font-bold tabular-nums text-foreground">
                    {formatCount(plan.filled_meals_count)} von {formatCount(plan.meals_count)}
                  </span>
                </div>
                <div className="flex min-w-[6rem] flex-col gap-0.5 rounded-lg bg-card px-3 py-2">
                  <span className="text-caption font-bold uppercase tracking-wider text-primary-dark">Personen</span>
                  <span className="font-display text-emphasis font-bold tabular-nums text-foreground">{formatCount(plan.norm_portions)}</span>
                </div>
                {plan.budget_per_person_per_day != null && (
                  <div className="flex min-w-[6rem] flex-col gap-0.5 rounded-lg bg-card px-3 py-2">
                    <span className="text-caption font-bold uppercase tracking-wider text-primary-dark">Pro Person / Tag</span>
                    <span className="font-display text-emphasis font-bold tabular-nums text-foreground">
                      {formatEuro(plan.budget_per_person_per_day)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex w-80 max-w-full items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-card" aria-hidden="true">
                  <div className="h-full bg-primary" style={{ width: `${planProgress}%` }} />
                </div>
                <span className="text-caption font-bold tabular-nums text-primary-dark">{planProgress} %</span>
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
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-white', step.badge)} aria-hidden="true">
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
            {popular.map((recipe, index) => (
              <li key={recipe.id}>
                {/* One "Beliebt" sticker per page: only the first popular card carries it. */}
                <RecipeCard recipe={recipe} popular={index === 0} />
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
