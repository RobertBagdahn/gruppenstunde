import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import DataQualityIngredientsPage from './DataQualityIngredientsPage';
import DataQualityRecipesPage from './DataQualityRecipesPage';
import PortionRepairList from '@/components/data-quality/PortionRepairList';
import DataOffensivePage from './DataOffensivePage';
import PageHeader from '@/components/shared/PageHeader';

const TABS = [
  { key: 'cockpit', label: 'Cockpit' },
  { key: 'ingredients', label: 'Zutaten' },
  { key: 'recipes', label: 'Rezepte' },
  { key: 'portion-repair', label: 'Portions-Reparatur' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function DataQualityPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const activeTab: TabKey = (TABS.find((t) => t.key === section)?.key) ?? 'cockpit';

  if (!section) return <Navigate to="/admin/data-quality/cockpit" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <PageHeader
        title="Datenqualität"
        description="Werkzeuge zur Verbesserung der Datenqualität von Zutaten und Rezepten"
      />

      {/* Section chips: white with a thin border, the active chip in petrol (as in the statistics page) */}
      <div className="relative mb-6">
        <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-2 min-w-max pb-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => navigate(`/admin/data-quality/${tab.key}`)}
                  className={cn(
                    'press flex min-h-11 md:min-h-9 items-center rounded-full border bg-card px-4 text-body font-semibold whitespace-nowrap transition-colors duration-200',
                    active
                      ? 'border-primary text-primary-dark'
                      : 'border-border text-foreground hover:border-primary-soft-border'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-background/80 sm:hidden" />
      </div>

      {activeTab === 'cockpit' && <DataOffensivePage />}
      {activeTab === 'ingredients' && <DataQualityIngredientsPage />}
      {activeTab === 'recipes' && <DataQualityRecipesPage />}
      {activeTab === 'portion-repair' && <PortionRepairList />}
    </div>
  );
}
