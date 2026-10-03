import { cn } from '@/lib/utils';
import CompletenessGrid from '@/components/data-quality/CompletenessGrid';
import MissingClassificationList from '@/components/data-quality/MissingClassificationList';
import NutritionPlausibilityList from '@/components/data-quality/NutritionPlausibilityList';
import PriceAnalysisTable from '@/components/data-quality/PriceAnalysisTable';
import DuplicateDetectionList from '@/components/data-quality/DuplicateDetectionList';
import BuffetCatalogProposalPanel from '@/components/data-quality/BuffetCatalogProposalPanel';
import { useNutritionPlausibility } from '@/api/dataQuality';
import { DataQualityIngredientsStateSchema, type DATA_QUALITY_TABS } from '@/schemas/listState';
import { usePersistedListState } from '@/hooks/usePersistedListState';

const TAB_DEFAULTS = { tab: 'price' } as const;

const SUB_TABS: readonly { key: (typeof DATA_QUALITY_TABS)[number]; label: string }[] = [
  { key: 'price', label: 'Preisanalyse' },
  { key: 'duplicates', label: 'Duplikate' },
  { key: 'completeness', label: 'Vollständigkeit' },
  { key: 'missing', label: 'Fehlende Klassifikation' },
  { key: 'plausibility', label: 'Nährwert-Plausibilität' },
  { key: 'buffet', label: 'Buffet-Vorschläge' },
];

export default function DataQualityIngredientsPage() {
  const { state, patch } = usePersistedListState({
    key: 'data-quality-ingredients',
    schema: DataQualityIngredientsStateSchema,
    defaults: TAB_DEFAULTS,
  });
  const activeTab = state.tab;

  const { data: plausibilityData } = useNutritionPlausibility({ page: 1, page_size: 1 });
  const plausibilityCount = plausibilityData?.total;

  const handleTabChange = (key: (typeof DATA_QUALITY_TABS)[number]) => {
    patch({ tab: key });
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
                'px-3 py-1.5 text-body font-medium whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{tab.label}</span>
              {isPlausibility && plausibilityCount != null && plausibilityCount > 0 && (
                <span className="text-caption font-semibold bg-danger-soft text-danger px-1.5 py-0.2 rounded-full">
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
      {activeTab === 'buffet' && <BuffetCatalogProposalPanel />}
    </div>
  );
}
