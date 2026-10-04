import { useState } from 'react';
import { useRetailSections } from '@/api/supplies';
import { INGREDIENT_STATUS_OPTIONS } from '@/lib/ingredientStatus';
import { Icon } from '@/components/ui/icon';
import { FilterGroup, FilterRadio, FilterSidebar, ActiveChip } from '@/components/shared/FilterParts';

interface IngredientFilters {
  retail_section?: number;
  status?: string;
  origin?: string;
}

interface IngredientFilterSidebarProps {
  filters: IngredientFilters;
  onFilterChange: (key: string, value: unknown) => void;
  onReset: () => void;
}

const STATUS_ICONS: Record<string, string> = { draft: 'edit_note', verified: 'check_circle' };

const STATUS_OPTIONS = [
  { value: '', label: 'Alle', icon: 'list' },
  ...INGREDIENT_STATUS_OPTIONS.map((option) => ({ ...option, icon: STATUS_ICONS[option.value] ?? 'label' })),
];

const VISIBLE_SECTIONS = 6;

export default function IngredientFilterSidebar({
  filters,
  onFilterChange,
  onReset,
}: IngredientFilterSidebarProps) {
  const { data: retailSections } = useRetailSections();
  const [showAllSections, setShowAllSections] = useState(false);

  const hasActiveFilters = !!filters.retail_section || !!filters.status || (filters.origin && filters.origin !== 'all');
  const activeFilterCount = (filters.retail_section ? 1 : 0) + (filters.status ? 1 : 0) + (filters.origin && filters.origin !== 'all' ? 1 : 0);

  // Long section lists: show the first few, the selected one always stays visible.
  const sections = retailSections ?? [];
  const visibleSections = showAllSections
    ? sections
    : sections.filter((rs, index) => index < VISIBLE_SECTIONS || rs.id === filters.retail_section);
  const hiddenSectionCount = sections.length - visibleSections.length;

  const activeSection = filters.retail_section ? sections.find((rs) => rs.id === filters.retail_section) : undefined;
  const activeStatus = filters.status ? STATUS_OPTIONS.find((o) => o.value === filters.status) : undefined;

  return (
    <FilterSidebar activeCount={activeFilterCount}>
      {hasActiveFilters && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Aktive Filter</span>
            <button onClick={onReset} className="flex items-center gap-1 text-caption font-medium text-primary hover:underline">
              <Icon name="close" size={16} />
              Alle löschen
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeSection && <ActiveChip label={activeSection.name} onRemove={() => onFilterChange('retail_section', undefined)} />}
            {activeStatus && <ActiveChip label={activeStatus.label} onRemove={() => onFilterChange('status', undefined)} />}
            {filters.origin && filters.origin !== 'all' && (
              <ActiveChip label="Meine Zutaten" onRemove={() => onFilterChange('origin', undefined)} />
            )}
          </div>
        </div>
      )}

      <FilterGroup title="Abteilung" icon="store">
        <FilterRadio
          name="retail_section"
          checked={!filters.retail_section}
          onChange={() => onFilterChange('retail_section', undefined)}
          label="Alle"
        />
        {visibleSections.map((rs) => (
          <FilterRadio
            key={rs.id}
            name="retail_section"
            checked={filters.retail_section === rs.id}
            onChange={() => onFilterChange('retail_section', rs.id)}
            label={rs.name}
          />
        ))}
        {(hiddenSectionCount > 0 || showAllSections) && sections.length > VISIBLE_SECTIONS && (
          <button
            type="button"
            onClick={() => setShowAllSections((current) => !current)}
            className="px-2 py-1.5 text-body font-medium text-primary hover:underline"
          >
            {showAllSections ? 'Weniger anzeigen' : `Alle ${sections.length} Abteilungen anzeigen`}
          </button>
        )}
      </FilterGroup>

      <FilterGroup title="Status" icon="verified">
        {STATUS_OPTIONS.map((opt) => (
          <FilterRadio
            key={opt.value}
            name="status"
            checked={(filters.status ?? '') === opt.value}
            onChange={() => onFilterChange('status', opt.value || undefined)}
            icon={opt.icon}
            label={opt.label}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Herkunft" icon="person">
        <FilterRadio
          name="origin"
          checked={!filters.origin || filters.origin === 'all'}
          onChange={() => onFilterChange('origin', undefined)}
          icon="public"
          label="Alle"
        />
        <FilterRadio
          name="origin"
          checked={filters.origin === 'mine'}
          onChange={() => onFilterChange('origin', 'mine')}
          icon="person"
          label="Meine Zutaten"
        />
      </FilterGroup>
    </FilterSidebar>
  );
}
