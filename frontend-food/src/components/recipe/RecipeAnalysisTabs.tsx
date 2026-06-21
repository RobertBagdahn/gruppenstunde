import { useState, type ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface Props {
  tabs: Tab[];
  showSummaryBox?: ReactNode;
}

export function RecipeAnalysisTabs({ tabs, showSummaryBox }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;
  const hasMultiple = tabs.length > 1;

  return (
    <section className="mt-8">
      {showSummaryBox}

      {hasMultiple && (
        <div className="flex overflow-x-auto gap-1.5 mb-4 pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {activeContent && (
        <div className="bg-card rounded-xl border p-5">
          {activeContent}
        </div>
      )}
    </section>
  );
}
