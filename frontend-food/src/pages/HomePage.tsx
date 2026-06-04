import { Link } from 'react-router-dom';
import { useFoodDashboard } from '@/api/dashboard';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
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
} from 'lucide-react';

const MODULES = [
  {
    key: 'recipes',
    label: 'Rezepte',
    icon: BookOpen,
    description: 'Durchsuche hunderte Rezepte – von Lagerfeuerküche bis Desserts. Erstelle eigene Rezepte mit Nährwertberechnung.',
    href: '/recipes',
    color: 'amber',
  },
  {
    key: 'ingredients',
    label: 'Zutaten',
    icon: Egg,
    description: 'Über 500 Zutaten mit exakten Nährwertangaben, Preisen und Portionsgrößen.',
    href: '/ingredients',
    color: 'emerald',
  },
  {
    key: 'meal-plans',
    label: 'Essensplan',
    icon: Utensils,
    description: 'Plane Mahlzeiten für Lager und Fahrten – mit automatischer Portionsberechnung und Nährwert-Cockpit.',
    href: '/meal-plans/app',
    color: 'sky',
  },
  {
    key: 'shopping',
    label: 'Einkaufslisten',
    icon: ShoppingCart,
    description: 'Kollaborative Einkaufslisten mit Echtzeit-Updates – sortiert nach Supermarkt-Abteilung.',
    href: '/shopping-lists',
    color: 'rose',
  },
  {
    key: 'simulator',
    label: 'Norm-Portion-Simulator',
    icon: Calculator,
    description: 'Berechne Energiebedarf und Normfaktoren nach Alter, Geschlecht und Aktivität.',
    href: '/tools/norm-portion-simulator',
    color: 'violet',
  },
] as const;

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  amber: { bg: 'bg-accent/10', text: 'text-accent-foreground', ring: 'ring-accent/20' },
  emerald: { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/20' },
  sky: { bg: 'bg-chart-3/10', text: 'text-chart-3', ring: 'ring-chart-3/20' },
  rose: { bg: 'bg-chart-5/10', text: 'text-chart-5', ring: 'ring-chart-5/20' },
  violet: { bg: 'bg-chart-4/10', text: 'text-chart-4', ring: 'ring-chart-4/20' },
};

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-xl border border-border bg-card p-4 md:p-5 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)] hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        <div>
          {value !== undefined ? (
            <p className="text-2xl font-extrabold text-foreground font-display">
              {value.toLocaleString('de-DE')}
            </p>
          ) : (
            <div className="h-8 w-16 bg-muted animate-pulse rounded-lg" />
          )}
          <p className="text-xs text-muted-foreground font-sans">{label}</p>
        </div>
      </div>
    </Link>
  );
}

function ModuleCard({ module }: { module: (typeof MODULES)[number] }) {
  const colors = COLOR_MAP[module.color];
  const Icon = module.icon;
  return (
    <Link
      to={module.href}
      className="group rounded-xl border border-border bg-card p-5 md:p-6 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)] hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col sm:flex-row items-start gap-4"
    >
      <div className={`flex items-center justify-center w-11 h-11 rounded-lg ${colors.bg} shrink-0`}>
        <Icon className={`w-5 h-5 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold mb-1 group-hover:text-primary transition-colors font-display">
          {module.label}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed font-sans">
          {module.description}
        </p>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 hidden sm:block" />
    </Link>
  );
}

export default function HomePage() {
  useDocumentMeta({ title: 'Inspi Food – Startseite' });
  const { data, isLoading } = useFoodDashboard();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-8 md:space-y-12 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl gradient-primary text-white py-12 md:py-16 px-6 md:px-8 shadow-lg">
        <div className="absolute inset-0 bg-dots-pattern opacity-[0.04] pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 hidden md:block" />
        <div className="relative max-w-3xl flex flex-col sm:flex-row items-center gap-6">
          <img
            src="/images/inspi_thinking.webp"
            alt="Inspi"
            className="h-20 md:h-24 w-auto drop-shadow-lg hidden sm:block shrink-0"
          />
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 font-display">Inspi Food</h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl font-sans leading-relaxed">
              Dein Küchen-Manager für jede Pfadfinder-Aktion – Rezepte, Essenspläne, Einkaufslisten und mehr.
            </p>
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Rezepte" value={data?.recipe_count} icon={BookOpen} href="/recipes" />
          <StatCard label="Zutaten" value={data?.ingredient_count} icon={Egg} href="/ingredients" />
          <StatCard label="Essenspläne" value={data?.meal_plan_count} icon={Utensils} href="/meal-plans/app" />
          <StatCard label="Einkaufslisten" value={data?.shopping_list_count} icon={ShoppingCart} href="/shopping-lists" />
        </div>
      </section>

      {/* Module Cards */}
      <section className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold font-display">Module & Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <ModuleCard key={m.key} module={m} />
          ))}
        </div>
      </section>

      {/* Insights */}
      {!isLoading && data?.insights && (
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold font-display">Insights</h2>
          <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)] space-y-3 font-sans">
            {data.insights.most_planned_recipe && (
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-[hsl(var(--accent))] shrink-0 fill-current" />
                <p className="text-sm">
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
                <p className="text-sm">
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
              <TrendingUp className="w-4 h-4 text-chart-3 shrink-0" />
              <p className="text-sm">
                Durchschnittlich{' '}
                <span className="font-semibold">
                  {data.insights.avg_ingredients_per_recipe}
                </span>{' '}
                Zutaten pro Rezept
              </p>
            </div>
            {data.insights.total_meal_days_planned > 0 && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[hsl(var(--chart-4))] shrink-0" />
                <p className="text-sm">
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
