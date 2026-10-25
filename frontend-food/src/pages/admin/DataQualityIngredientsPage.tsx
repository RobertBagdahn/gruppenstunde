import { cn } from '@/lib/utils';
import CompletenessGrid from '@/components/data-quality/CompletenessGrid';
import MissingClassificationList from '@/components/data-quality/MissingClassificationList';
import NutritionPlausibilityList from '@/components/data-quality/NutritionPlausibilityList';
import PriceAnalysisTable from '@/components/data-quality/PriceAnalysisTable';
import DuplicateDetectionList from '@/components/data-quality/DuplicateDetectionList';
import BuffetCatalogProposalPanel from '@/components/data-quality/BuffetCatalogProposalPanel';
import { AliasConflictList, SuspiciousPortionList } from '@/components/data-quality/QuantityChecks';
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
  { key: 'portions', label: 'Stückgewichte' },
  { key: 'aliases', label: 'Alias-Konflikte' },
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
      {/* Check chips: white with a thin border, the active chip in petrol */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div role="group" aria-label="Zutaten-Prüfungen" className="flex gap-2 min-w-max pb-2">
          {SUB_TABS.map((tab) => {
            const isPlausibility = tab.key === 'plausibility';
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'press flex min-h-11 md:min-h-9 items-center gap-2 rounded-full border bg-card px-4 text-body font-semibold whitespace-nowrap transition-colors duration-200',
                  active
                    ? 'border-primary text-primary-dark'
                    : 'border-border text-foreground hover:border-primary-soft-border'
                )}
              >
                <span>{tab.label}</span>
                {isPlausibility && plausibilityCount != null && plausibilityCount > 0 && (
                  <span className="text-caption font-semibold tabular-nums bg-danger-soft text-danger px-2 py-0.5 rounded-full">
                    {plausibilityCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'price' && <PriceAnalysisTable />}
      {activeTab === 'duplicates' && <DuplicateDetectionList type="ingredient" />}
      {activeTab === 'completeness' && <CompletenessGrid />}
      {activeTab === 'missing' && <MissingClassificationList />}
      {activeTab === 'plausibility' && <NutritionPlausibilityList />}
      {activeTab === 'buffet' && <BuffetCatalogProposalPanel />}
      {activeTab === 'portions' && <SuspiciousPortionList />}
      {activeTab === 'aliases' && <AliasConflictList />}
    </div>
  );
}
