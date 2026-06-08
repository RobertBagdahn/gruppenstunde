import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import DataQualityIngredientsPage from './DataQualityIngredientsPage';
import DataQualityRecipesPage from './DataQualityRecipesPage';

const TABS = [
  { key: 'ingredients', label: 'Zutaten' },
  { key: 'recipes', label: 'Rezepte' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function DataQualityPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const activeTab: TabKey = (TABS.find((t) => t.key === section)?.key) ?? 'ingredients';

  if (!section) return <Navigate to="/admin/data-quality/ingredients" replace />;

  return (
    <div className="container py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">Datenqualität</h1>
        <p className="text-sm text-muted-foreground">
          Werkzeuge zur Verbesserung der Datenqualität von Zutaten und Rezepten
        </p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(`/admin/data-quality/${tab.key}`)}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ingredients' && <DataQualityIngredientsPage />}
      {activeTab === 'recipes' && <DataQualityRecipesPage />}
    </div>
  );
}
