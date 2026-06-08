import { useState } from 'react';
import { cn } from '@/lib/utils';
import MetadataCheckList from '@/components/data-quality/MetadataCheckList';
import CacheStalenessList from '@/components/data-quality/CacheStalenessList';
import PortionPlausibilityList from '@/components/data-quality/PortionPlausibilityList';
import DuplicateDetectionList from '@/components/data-quality/DuplicateDetectionList';

const SUB_TABS = [
  { key: 'duplicates', label: 'Duplikate' },
  { key: 'metadata', label: 'Metadaten-Check' },
  { key: 'cache', label: 'Cache-Staleness' },
  { key: 'portion', label: 'Portions-Plausibilität' },
] as const;

export default function DataQualityRecipesPage() {
  const [activeTab, setActiveTab] = useState<string>('duplicates');

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

      {activeTab === 'duplicates' && <DuplicateDetectionList type="recipe" />}
      {activeTab === 'metadata' && <MetadataCheckList />}
      {activeTab === 'cache' && <CacheStalenessList />}
      {activeTab === 'portion' && <PortionPlausibilityList />}
    </div>
  );
}
