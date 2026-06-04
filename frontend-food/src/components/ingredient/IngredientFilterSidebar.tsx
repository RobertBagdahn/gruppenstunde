import { useState } from 'react';
import { useRetailSections } from '@/api/supplies';

interface IngredientFilters {
  retail_section?: number;
  status?: string;
}

interface IngredientFilterSidebarProps {
  filters: IngredientFilters;
  onFilterChange: (key: string, value: unknown) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Alle', icon: 'list' },
  { value: 'published', label: 'Veroeffentlicht', icon: 'check_circle' },
  { value: 'draft', label: 'Entwurf', icon: 'edit_note' },
  { value: 'archived', label: 'Archiviert', icon: 'archive' },
];

export default function IngredientFilterSidebar({
  filters,
  onFilterChange,
  onReset,
}: IngredientFilterSidebarProps) {
  const { data: retailSections } = useRetailSections();
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasActiveFilters = !!filters.retail_section || !!filters.status;
  const activeFilterCount = (filters.retail_section ? 1 : 0) + (filters.status ? 1 : 0);

  return (
    <aside className="w-full md:w-64 shrink-0">
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden w-full flex items-center justify-between gap-2 bg-card rounded-xl border p-4 mb-2 font-semibold text-sm"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
          Filter {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-white text-xs px-1.5">
              {activeFilterCount}
            </span>
          )}
        </span>
        <span className={`material-symbols-outlined text-[20px] transition-transform ${mobileOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      <div className={`space-y-4 ${mobileOpen ? 'block' : 'hidden md:block'}`}>
        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
                Aktive Filter
              </span>
              <button onClick={onReset} className="flex items-center gap-1 text-xs text-destructive hover:underline">
                <span className="material-symbols-outlined text-[14px]">close</span>
                Alle loeschen
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.retail_section && retailSections && (() => {
                const rs = retailSections.find((s) => s.id === filters.retail_section);
                return rs ? (
                  <button
                    onClick={() => onFilterChange('retail_section', undefined)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {rs.name}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })()}
              {filters.status && (() => {
                const opt = STATUS_OPTIONS.find((o) => o.value === filters.status);
                return opt ? (
                  <button
                    onClick={() => onFilterChange('status', undefined)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {opt.label}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })()}
            </div>
          </div>
        )}

        {/* Retail Section */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="flex items-center gap-2 text-sm font-display font-bold text-foreground mb-3">
            <span className="material-symbols-outlined text-muted-foreground text-[18px]">store</span>
            Abteilung
          </h3>
          <div className="space-y-1">
            <label className="flex items-center gap-2 py-1 cursor-pointer text-sm hover:text-primary">
              <input
                type="radio"
                name="retail_section"
                checked={!filters.retail_section}
                onChange={() => onFilterChange('retail_section', undefined)}
                className="accent-primary"
              />
              Alle
            </label>
            {retailSections?.map((rs) => (
              <label
                key={rs.id}
                className="flex items-center gap-2 py-1 cursor-pointer text-sm hover:text-primary"
              >
                <input
                  type="radio"
                  name="retail_section"
                  checked={filters.retail_section === rs.id}
                  onChange={() => onFilterChange('retail_section', rs.id)}
                  className="accent-primary"
                />
                {rs.name}
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="flex items-center gap-2 text-sm font-display font-bold text-foreground mb-3">
            <span className="material-symbols-outlined text-muted-foreground text-[18px]">verified</span>
            Status
          </h3>
          <div className="space-y-1">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 py-1 cursor-pointer text-sm hover:text-primary"
              >
                <input
                  type="radio"
                  name="status"
                  checked={(filters.status ?? '') === opt.value}
                  onChange={() => onFilterChange('status', opt.value || undefined)}
                  className="accent-primary"
                />
                <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
