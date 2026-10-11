import HeroBand from '@/components/shared/HeroBand';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import DataQualityIngredientsPage from './DataQualityIngredientsPage';
import DataQualityRecipesPage from './DataQualityRecipesPage';
import PortionRepairList from '@/components/data-quality/PortionRepairList';
import DataOffensivePage from './DataOffensivePage';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-6">
<HeroBand pullUpClassName="-mt-4 md:-mt-8" className="mb-6">
      <div className="space-y-1">
        <h1 className="font-display text-display font-extrabold text-hero-foreground">Datenqualität</h1>
        <p className="text-emphasis text-hero-muted mt-2">
          Werkzeuge zur Verbesserung der Datenqualität von Zutaten und Rezepten
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto pt-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(`/admin/data-quality/${tab.key}`)}
            className={cn(
              'press h-10 px-4 rounded-full text-body font-semibold whitespace-nowrap transition-colors',
              activeTab === tab.key
                ? 'bg-hero-foreground text-foreground'
                : 'text-hero-muted hover:bg-hero-soft hover:text-hero-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      </HeroBand>

      {activeTab === 'cockpit' && <DataOffensivePage />}
      {activeTab === 'ingredients' && <DataQualityIngredientsPage />}
      {activeTab === 'recipes' && <DataQualityRecipesPage />}
      {activeTab === 'portion-repair' && <PortionRepairList />}
    </div>
  );
}
