import { useState } from 'react';
import {
  MEALPLAN_ORIGIN_OPTIONS,
} from '@/schemas/mealPlan';

interface MealPlanFilterSidebarProps {
  origin: string;
  onOriginChange: (origin: string) => void;
  onReset: () => void;
}

export default function MealPlanFilterSidebar({ origin, onOriginChange, onReset }: MealPlanFilterSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasActiveFilter = origin && origin !== 'all';

  return (
    <aside className="w-full md:w-64 shrink-0">
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden w-full flex items-center justify-between gap-2 bg-card rounded-xl border p-4 mb-2 font-semibold text-sm"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
          Filter
          {hasActiveFilter && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-white text-xs px-1.5">
              1
            </span>
          )}
        </span>
        <span className={`material-symbols-outlined text-[20px] transition-transform ${mobileOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      <div className={`space-y-4 ${mobileOpen ? 'block' : 'hidden md:block'}`}>
        {/* Active filter chips */}
        {hasActiveFilter && (
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
                Aktive Filter
              </span>
              <button onClick={onReset} className="flex items-center gap-1 text-xs text-destructive hover:underline">
                <span className="material-symbols-outlined text-[14px]">close</span>
                Alle löschen
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {origin && origin !== 'all' && (() => {
                const opt = MEALPLAN_ORIGIN_OPTIONS.find((o) => o.value === origin);
                return opt ? (
                  <button
                    onClick={() => onOriginChange('all')}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {opt.label}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })()}
            </div>
          </div>
        )}

        {/* Origin / Herkunft */}
        <div className="bg-card rounded-xl border-l-4 border-l-primary border p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
            <span className="text-primary">Herkunft</span>
          </h3>
          {MEALPLAN_ORIGIN_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
              <input
                type="radio"
                name="origin"
                checked={(origin ?? 'all') === opt.value}
                onChange={() => onOriginChange(opt.value === 'all' ? 'all' : opt.value)}
                className="border-muted-foreground accent-primary"
              />
              <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}