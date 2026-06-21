import { useSearchParams } from 'react-router-dom';
import { useRetailSections } from '@/api/supplies';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: retailSections } = useRetailSections();

  const retailSectionId = searchParams.get('retail_section') || '';
  const tagFilter = searchParams.get('tag') || '';

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
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
          onClick={() => setSearchParams({}, { replace: true })}
          className="px-3 py-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}
