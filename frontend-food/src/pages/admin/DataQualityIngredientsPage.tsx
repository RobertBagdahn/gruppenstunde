import { useState } from 'react';
import { cn } from '@/lib/utils';
import CompletenessGrid from '@/components/data-quality/CompletenessGrid';
import MissingClassificationList from '@/components/data-quality/MissingClassificationList';
import NutritionPlausibilityList from '@/components/data-quality/NutritionPlausibilityList';
import PriceAnalysisTable from '@/components/data-quality/PriceAnalysisTable';
import DuplicateDetectionList from '@/components/data-quality/DuplicateDetectionList';

const SUB_TABS = [
  { key: 'price', label: 'Preisanalyse' },
  { key: 'duplicates', label: 'Duplikate' },
  { key: 'completeness', label: 'Vollständigkeit' },
  { key: 'missing', label: 'Fehlende Klassifikation' },
  { key: 'plausibility', label: 'Nährwert-Plausibilität' },
] as const;

export default function DataQualityIngredientsPage() {
  const [activeTab, setActiveTab] = useState<string>('price');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b overflow-x-auto">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'price' && <PriceAnalysisTable />}
      {activeTab === 'duplicates' && <DuplicateDetectionList type="ingredient" />}
      {activeTab === 'completeness' && <CompletenessGrid />}
      {activeTab === 'missing' && <MissingClassificationList />}
      {activeTab === 'plausibility' && <NutritionPlausibilityList />}
    </div>
  );
}
