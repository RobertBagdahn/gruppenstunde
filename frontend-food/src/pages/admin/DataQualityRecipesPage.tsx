import { useState } from 'react';
import { cn } from '@/lib/utils';
import MetadataCheckList from '@/components/data-quality/MetadataCheckList';
import CacheStalenessList from '@/components/data-quality/CacheStalenessList';
import PortionPlausibilityList from '@/components/data-quality/PortionPlausibilityList';
import DuplicateDetectionList from '@/components/data-quality/DuplicateDetectionList';
import { QuantityOutlierList, UndividedLineList } from '@/components/data-quality/QuantityChecks';

const SUB_TABS = [
  { key: 'duplicates', label: 'Duplikate' },
  { key: 'metadata', label: 'Metadaten-Check' },
  { key: 'cache', label: 'Cache-Staleness' },
  { key: 'portion', label: 'Portions-Plausibilität' },
  { key: 'quantities', label: 'Auffällige Mengen' },
  { key: 'undivided', label: 'Ungeteilte Zeilen' },
] as const;

export default function DataQualityRecipesPage() {
  const [activeTab, setActiveTab] = useState<string>('duplicates');

  return (
    <div className="space-y-4">
      {/* Check chips: white with a thin border, the active chip in petrol */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div role="group" aria-label="Rezept-Prüfungen" className="flex gap-2 min-w-max pb-2">
          {SUB_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveTab(tab.key)}
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

      {activeTab === 'duplicates' && <DuplicateDetectionList type="recipe" />}
      {activeTab === 'metadata' && <MetadataCheckList />}
      {activeTab === 'cache' && <CacheStalenessList />}
      {activeTab === 'portion' && <PortionPlausibilityList />}
      {activeTab === 'quantities' && <QuantityOutlierList />}
      {activeTab === 'undivided' && <UndividedLineList />}
    </div>
  );
}
