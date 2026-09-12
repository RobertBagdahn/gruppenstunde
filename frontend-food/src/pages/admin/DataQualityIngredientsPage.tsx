import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import CompletenessGrid from '@/components/data-quality/CompletenessGrid';
import MissingClassificationList from '@/components/data-quality/MissingClassificationList';
import NutritionPlausibilityList from '@/components/data-quality/NutritionPlausibilityList';
import PriceAnalysisTable from '@/components/data-quality/PriceAnalysisTable';
import DuplicateDetectionList from '@/components/data-quality/DuplicateDetectionList';
import { useNutritionPlausibility } from '@/api/dataQuality';

const SUB_TABS = [
  { key: 'price', label: 'Preisanalyse' },
  { key: 'duplicates', label: 'Duplikate' },
  { key: 'completeness', label: 'Vollständigkeit' },
  { key: 'missing', label: 'Fehlende Klassifikation' },
  { key: 'plausibility', label: 'Nährwert-Plausibilität' },
] as const;

export default function DataQualityIngredientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const activeTab = SUB_TABS.some((t) => t.key === tabFromUrl) ? tabFromUrl! : 'price';

  const { data: plausibilityData } = useNutritionPlausibility({ page: 1, page_size: 1 });
  const plausibilityCount = plausibilityData?.total;

  const handleTabChange = (key: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const isPlausibility = tab.key === 'plausibility';
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{tab.label}</span>
              {isPlausibility && plausibilityCount != null && plausibilityCount > 0 && (
                <span className="text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.2 rounded-full">
                  {plausibilityCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'price' && <PriceAnalysisTable />}
      {activeTab === 'duplicates' && <DuplicateDetectionList type="ingredient" />}
      {activeTab === 'completeness' && <CompletenessGrid />}
      {activeTab === 'missing' && <MissingClassificationList />}
      {activeTab === 'plausibility' && <NutritionPlausibilityList />}
    </div>
  );
}
