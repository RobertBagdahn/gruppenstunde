import { Link } from 'react-router-dom';
import { useFoodDashboard } from '@/api/dashboard';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { areaTileClass, type PageArea } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '@/lib/format';
import {
  BookOpen,
  Egg,
  Utensils,
  ShoppingCart,
  Calculator,
  ArrowRight,
  Star,
  Sparkles,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';

const MODULES = [
  {
    key: 'recipes',
    label: 'Rezepte',
    icon: BookOpen,
    description: 'Durchsuche hunderte Rezepte – von Lagerfeuerküche bis Desserts. Erstelle eigene Rezepte mit Nährwertberechnung.',
    href: '/recipes',
    area: 'recipes',
  },
  {
    key: 'ingredients',
    label: 'Zutaten',
    icon: Egg,
    description: 'Tausende Zutaten mit exakten Nährwertangaben, Preisen und Portionsgrößen.',
    href: '/ingredients',
    area: 'ingredients',
  },
  {
    key: 'meal-plans',
    label: 'Essensplan',
    icon: Utensils,
    description: 'Plane Mahlzeiten für Lager und Fahrten – mit automatischer Portionsberechnung und Nährwert-Cockpit.',
    href: '/meal-plans/app',
    area: 'planner',
  },
  {
    key: 'shopping',
    label: 'Einkaufslisten',
    icon: ShoppingCart,
    description: 'Kollaborative Einkaufslisten mit Echtzeit-Updates – sortiert nach Supermarkt-Abteilung.',
    href: '/shopping-lists',
    area: 'shopping',
  },
  {
    key: 'simulator',
    label: 'Norm-Portion-Simulator',
    icon: Calculator,
    description: 'Berechne Energiebedarf und Normfaktoren nach Alter, Geschlecht und Aktivität.',
    href: '/tools/norm-portion-simulator',
    area: 'neutral',
  },
  {
    key: 'statistics',
    label: 'Zutaten-Statistiken',
    icon: BarChart3,
    description: 'Entdecke Verteilungen, Extreme und Zusammenhänge in der Zutatendatenbank – Rankings, Scores und mehr.',
    href: '/ingredients/statistics',
    area: 'neutral',
  },
] as const;


function StatCard({
  label,
  value,
  staticValue,
  icon: Icon,
  href,
  area,
  failed = false,
}: {
  label: string;
  value?: number;
  /** Text shown instead of a count, for tiles that link to a page without a number. */
  staticValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  area: PageArea;
  /** The dashboard failed: show a dash instead of an endless skeleton. */
  failed?: boolean;
}) {
  return (
    <Link
      to={href}
      className="group rounded-xl bg-card p-4 md:p-5 shadow-card card-hover"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${areaTileClass(area)}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          {staticValue !== undefined ? (
            <p className="text-title font-extrabold text-foreground font-display">{staticValue}</p>
          ) : value !== undefined ? (
            <p className="text-title font-extrabold text-foreground font-display">
              {formatCount(value)}
            </p>
          ) : failed ? (
            <p className="text-title font-extrabold text-muted-foreground font-display" title="Zahl konnte nicht geladen werden">–</p>
          ) : (
            <Skeleton className="h-9 w-16" />
          )}
          <p className="text-caption text-muted-foreground font-sans">{label}</p>
        </div>
      </div>
    </Link>
  );
}

function ModuleCard({ module }: { module: (typeof MODULES)[number] }) {
  const Icon = module.icon;
  return (
    <Link
      to={module.href}
      className="group rounded-xl bg-card p-5 md:p-6 shadow-card card-hover flex flex-col sm:flex-row items-start gap-4"
    >
      <div className={`flex items-center justify-center w-11 h-11 rounded-lg ${areaTileClass(module.area)} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-emphasis font-bold mb-1 group-hover:text-primary transition-colors font-display">
          {module.label}
        </h3>
        <p className="text-body text-muted-foreground leading-relaxed font-sans">
          {module.description}
        </p>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 hidden sm:block" />
    </Link>
  );
}

export default function HomePage() {
  useDocumentMeta({ title: 'Inspi Food – Startseite' });
  const { data, isLoading, isError } = useFoodDashboard();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-8 md:space-y-12 pb-12">
      {/* Welcome */}
      <section className="rounded-xl gradient-soft px-6 py-10 md:px-10 md:py-14">
        <div className="flex max-w-3xl flex-col items-start gap-6 sm:flex-row sm:items-center">
          <img
            src="/images/inspi_thinking.webp"
            alt="Inspi"
            className="hidden h-20 w-auto shrink-0 sm:block md:h-24"
          />
          <div>
            <h1 className="mb-2 font-display text-title font-extrabold text-foreground">Inspi Food</h1>
            <p className="max-w-2xl font-sans text-emphasis leading-relaxed text-muted-foreground">
              Dein Küchen-Manager für jede Pfadfinder-Aktion – Rezepte, Essenspläne, Einkaufslisten und mehr.
            </p>
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard area="recipes" failed={isError} label="Rezepte" value={data?.recipe_count} icon={BookOpen} href="/recipes" />
          <StatCard area="ingredients" failed={isError} label="Zutaten" value={data?.ingredient_count} icon={Egg} href="/ingredients" />
          <StatCard area="planner" failed={isError} label="Essenspläne" value={data?.meal_plan_count} icon={Utensils} href="/meal-plans/app" />
          <StatCard area="shopping" failed={isError} label="Einkaufslisten" value={data?.shopping_list_count} icon={ShoppingCart} href="/shopping-lists" />
          <StatCard area="neutral" label="Statistiken" staticValue="Ansehen" icon={BarChart3} href="/ingredients/statistics" />
        </div>
      </section>

      {/* Module Cards */}
      <section className="space-y-4">
        <h2 className="text-section font-bold font-display">Module & Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <ModuleCard key={m.key} module={m} />
          ))}
        </div>
      </section>

      {/* Insights */}
      {isLoading && (
        <section className="space-y-4" aria-busy="true">
          <Skeleton className="h-7 w-32" />
          <div className="space-y-3 rounded-xl bg-card p-5 shadow-card md:p-6">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-3/4" />
            ))}
          </div>
        </section>
      )}
      {!isLoading && data?.insights && (
        <section className="section-enter space-y-4">
          <h2 className="text-section font-bold font-display">Insights</h2>
          <div className="rounded-xl bg-card p-5 md:p-6 shadow-card space-y-3 font-sans">
            {data.insights.most_planned_recipe && (
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-area-shopping shrink-0 fill-current" />
                <p className="text-body">
                  Beliebtestes Rezept:{' '}
                  <Link
                    to={`/recipes/${data.insights.most_planned_recipe.slug}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {data.insights.most_planned_recipe.title}
                  </Link>
                  {data.insights.most_planned_recipe.plan_count && (
                    <span className="text-muted-foreground">
                      {' '}
                      ({data.insights.most_planned_recipe.plan_count}x geplant)
                    </span>
                  )}
                </p>
              </div>
            )}
            {data.insights.newest_recipe && (
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <p className="text-body">
                  Neuestes Rezept:{' '}
                  <Link
                    to={`/recipes/${data.insights.newest_recipe.slug}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {data.insights.newest_recipe.title}
                  </Link>
                </p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-info shrink-0" />
              <p className="text-body">
                Durchschnittlich{' '}
                <span className="font-semibold">
                  {data.insights.avg_ingredients_per_recipe}
                </span>{' '}
                Zutaten pro Rezept
              </p>
            </div>
            {data.insights.total_meal_days_planned > 0 && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-area-planner shrink-0" />
                <p className="text-body">
                  <span className="font-semibold">
                    {data.insights.total_meal_days_planned}
                  </span>{' '}
                  Tage mit Mahlzeiten geplant
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
