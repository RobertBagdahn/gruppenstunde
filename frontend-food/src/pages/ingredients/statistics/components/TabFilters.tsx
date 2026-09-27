import { useRetailSections } from '@/api/supplies';
import { IngredientStatsStateSchema } from '@/schemas/listState';
import { usePersistedListState } from '@/hooks/usePersistedListState';

const NO_DEFAULTS = {};

interface TabFiltersProps {
  showRetailSection?: boolean;
  showTag?: boolean;
  tagOptions?: Array<{ value: string; label: string }>;
  extraContent?: React.ReactNode;
}

export default function TabFilters({
  showRetailSection = true,
  showTag = false,
  tagOptions = [],
  extraContent,
}: TabFiltersProps) {
  const { state, patch, reset } = usePersistedListState({
    key: 'ingredient-stats',
    schema: IngredientStatsStateSchema,
    defaults: NO_DEFAULTS,
  });
  const { data: retailSections } = useRetailSections();

  const retailSectionId = state.retail_section ?? '';
  const tagFilter = state.tag ?? '';

  const updateParam = (key: 'retail_section' | 'tag', value: string) => {
    patch({ [key]: value || undefined }, { replace: true });
  };

  const hasFilters = retailSectionId || tagFilter;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {showRetailSection && retailSections && (
        <select
          value={retailSectionId}
          onChange={(e) => updateParam('retail_section', e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-border text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
        >
          <option value="">Alle Abteilungen</option>
          {retailSections.map((rs) => (
            <option key={rs.id} value={String(rs.id)}>
              {rs.name}
            </option>
          ))}
        </select>
      )}

      {showTag && tagOptions.length > 0 && (
        <select
          value={tagFilter}
          onChange={(e) => updateParam('tag', e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-border text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
        >
          <option value="">Alle Tags</option>
          {tagOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {extraContent}

      {hasFilters && (
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}
