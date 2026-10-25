import { useState, type ReactNode } from 'react';
import { useRetailSections } from '@/api/supplies';
import { INGREDIENT_STATUS_OPTIONS } from '@/lib/ingredientStatus';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

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

/** Filter chip on white ground: active = petrol border and text, never a filled surface. */
function FilterChip({
  active,
  onSelect,
  icon,
  label,
}: {
  active: boolean;
  onSelect: () => void;
  icon?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        'press flex h-11 md:h-9 items-center gap-2 rounded-full border bg-card px-4 text-body font-semibold transition-colors duration-200',
        active ? 'border-primary text-primary-dark' : 'border-border text-foreground hover:border-primary-soft-border',
      )}
    >
      {icon && <Icon name={icon} size={16} />}
      {label}
    </button>
  );
}

function ChipGroup({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon name={icon} size={16} />
        <span>{title}</span>
      </h3>
      <div role="group" aria-label={title} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

export default function IngredientFilterSidebar({
  filters,
  onFilterChange,
  onReset,
}: IngredientFilterSidebarProps) {
  const { data: retailSections } = useRetailSections();
  const [showAllSections, setShowAllSections] = useState(false);

  const hasActiveFilters = !!filters.retail_section || !!filters.status || (filters.origin && filters.origin !== 'all');

  // Long section lists: show the first few, the selected one always stays visible.
  const sections = retailSections ?? [];
  const visibleSections = showAllSections
    ? sections
    : sections.filter((rs, index) => index < VISIBLE_SECTIONS || rs.id === filters.retail_section);
  const hiddenSectionCount = sections.length - visibleSections.length;

  return (
    <div className="space-y-4">
      {hasActiveFilters && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onReset}
            className="press flex h-11 md:h-9 items-center gap-1.5 rounded-lg px-3 text-body font-semibold text-primary-dark hover:bg-primary-soft transition-colors"
          >
            <Icon name="close" size={16} />
            Alle Filter löschen
          </button>
        </div>
      )}

      <ChipGroup title="Abteilung" icon="store">
        <FilterChip
          active={!filters.retail_section}
          onSelect={() => onFilterChange('retail_section', undefined)}
          label="Alle"
        />
        {visibleSections.map((rs) => (
          <FilterChip
            key={rs.id}
            active={filters.retail_section === rs.id}
            onSelect={() => onFilterChange('retail_section', rs.id)}
            label={rs.name}
          />
        ))}
        {(hiddenSectionCount > 0 || showAllSections) && sections.length > VISIBLE_SECTIONS && (
          <button
            type="button"
            onClick={() => setShowAllSections((current) => !current)}
            className="press flex h-11 md:h-9 items-center rounded-full px-3 text-body font-semibold text-primary-dark hover:underline"
          >
            {showAllSections ? 'Weniger anzeigen' : `Alle ${sections.length} Abteilungen anzeigen`}
          </button>
        )}
      </ChipGroup>

      <ChipGroup title="Status" icon="verified">
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value || 'all'}
            active={(filters.status ?? '') === opt.value}
            onSelect={() => onFilterChange('status', opt.value || undefined)}
            icon={opt.icon}
            label={opt.label}
          />
        ))}
      </ChipGroup>

      <ChipGroup title="Herkunft" icon="person">
        <FilterChip
          active={!filters.origin || filters.origin === 'all'}
          onSelect={() => onFilterChange('origin', undefined)}
          icon="public"
          label="Alle"
        />
        <FilterChip
          active={filters.origin === 'mine'}
          onSelect={() => onFilterChange('origin', 'mine')}
          icon="person"
          label="Meine Zutaten"
        />
      </ChipGroup>
    </div>
  );
}
