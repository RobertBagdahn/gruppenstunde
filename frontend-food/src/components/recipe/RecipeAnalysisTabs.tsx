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
    <section>
      {showSummaryBox}

      {hasMultiple && (
        <div role="tablist" aria-label="Analysebereiche" className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`press h-10 shrink-0 whitespace-nowrap rounded-lg px-4 text-body font-semibold transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-soft text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {activeContent && (
        <div key={activeTab} role="tabpanel" className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
          {activeContent}
        </div>
      )}
    </section>
  );
}
