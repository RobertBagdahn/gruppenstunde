import { Link } from 'react-router-dom';
import { useFoodDashboard } from '@/api/dashboard';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const MODULES = [
  {
    key: 'recipes',
    label: 'Rezepte',
    icon: 'menu_book',
    description: 'Durchsuche hunderte Rezepte – von Lagerfeuerküche bis Desserts. Erstelle eigene Rezepte mit Nährwertberechnung.',
    href: '/recipes',
    color: 'amber',
  },
  {
    key: 'ingredients',
    label: 'Zutaten',
    icon: 'egg',
    description: 'Über 500 Zutaten mit exakten Nährwertangaben, Preisen und Portionsgrößen.',
    href: '/ingredients',
    color: 'emerald',
  },
  {
    key: 'meal-plans',
    label: 'Essensplan',
    icon: 'restaurant_menu',
    description: 'Plane Mahlzeiten für Lager und Fahrten – mit automatischer Portionsberechnung und Nährwert-Cockpit.',
    href: '/meal-plans/app',
    color: 'sky',
  },
  {
    key: 'shopping',
    label: 'Einkaufslisten',
    icon: 'shopping_cart',
    description: 'Kollaborative Einkaufslisten mit Echtzeit-Updates – sortiert nach Supermarkt-Abteilung.',
    href: '/shopping-lists',
    color: 'rose',
  },
  {
    key: 'simulator',
    label: 'Norm-Portion-Simulator',
    icon: 'calculate',
    description: 'Berechne Energiebedarf und Normfaktoren nach Alter, Geschlecht und Aktivität.',
    href: '/tools/norm-portion-simulator',
    color: 'violet',
  },
] as const;

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-200' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-200' },
};

function StatCard({ label, value, icon, href }: { label: string; value: number | undefined; icon: string; href: string }) {
  return (
    <Link to={href} className="group rounded-2xl border border-border/60 bg-card p-4 md:p-5 shadow-soft hover:shadow-md transition-all hover:scale-[1.02]">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-muted-foreground text-[24px]">{icon}</span>
        <div>
          {value !== undefined ? (
            <p className="text-2xl font-bold text-foreground">{value.toLocaleString('de-DE')}</p>
          ) : (
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Link>
  );
}

function ModuleCard({ module }: { module: typeof MODULES[number] }) {
  const colors = COLOR_MAP[module.color];
  return (
    <Link
      to={module.href}
      className="group rounded-2xl border border-border/60 bg-card p-5 md:p-6 shadow-soft hover:shadow-md transition-all hover:scale-[1.01] flex flex-col sm:flex-row items-start gap-4"
    >
      <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${colors.bg} shrink-0`}>
        <span className={`material-symbols-outlined ${colors.text} text-[24px]`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {module.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold mb-1 group-hover:text-primary transition-colors">{module.label}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{module.description}</p>
      </div>
      <span className="material-symbols-outlined text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 hidden sm:block">
        arrow_forward
      </span>
    </Link>
  );
}

export default function HomePage() {
  useDocumentMeta({ title: 'Inspi Food – Startseite' });
  const { data, isLoading } = useFoodDashboard();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-cyan-600 text-white py-12 md:py-20">
        <div className="absolute inset-0 bg-dots-pattern opacity-[0.04] pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="container relative text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Inspi Food</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Dein Küchen-Manager für jede Pfadfinder-Aktion – Rezepte, Essenspläne, Einkaufslisten und mehr.
          </p>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="container -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Rezepte" value={data?.recipe_count} icon="menu_book" href="/recipes" />
          <StatCard label="Zutaten" value={data?.ingredient_count} icon="egg" href="/ingredients" />
          <StatCard label="Essenspläne" value={data?.meal_plan_count} icon="restaurant_menu" href="/meal-plans/app" />
          <StatCard label="Einkaufslisten" value={data?.shopping_list_count} icon="shopping_cart" href="/shopping-lists" />
        </div>
      </section>

      {/* Module Cards */}
      <section className="container py-10 md:py-14">
        <h2 className="text-xl font-bold mb-6">Module & Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <ModuleCard key={m.key} module={m} />
          ))}
        </div>
      </section>

      {/* Insights */}
      {!isLoading && data?.insights && (
        <section className="container pb-12">
          <h2 className="text-xl font-bold mb-4">Insights</h2>
          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 space-y-3">
            {data.insights.most_planned_recipe && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500">star</span>
                <p className="text-sm">
                  Beliebtestes Rezept:{' '}
                  <Link to={`/recipes/${data.insights.most_planned_recipe.slug}`} className="font-semibold text-primary hover:underline">
                    {data.insights.most_planned_recipe.title}
                  </Link>
                  {data.insights.most_planned_recipe.plan_count && (
                    <span className="text-muted-foreground"> ({data.insights.most_planned_recipe.plan_count}x geplant)</span>
                  )}
                </p>
              </div>
            )}
            {data.insights.newest_recipe && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-500">new_releases</span>
                <p className="text-sm">
                  Neuestes Rezept:{' '}
                  <Link to={`/recipes/${data.insights.newest_recipe.slug}`} className="font-semibold text-primary hover:underline">
                    {data.insights.newest_recipe.title}
                  </Link>
                </p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-sky-500">analytics</span>
              <p className="text-sm">
                Durchschnittlich <span className="font-semibold">{data.insights.avg_ingredients_per_recipe}</span> Zutaten pro Rezept
              </p>
            </div>
            {data.insights.total_meal_days_planned > 0 && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-violet-500">calendar_month</span>
                <p className="text-sm">
                  <span className="font-semibold">{data.insights.total_meal_days_planned}</span> Tage mit Mahlzeiten geplant
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
