/**
 * SearchTabs — Horizontal tab bar for filtering search results by content type.
 *
 * Shows: Alle | Gruppenstunden | Spiele | Rezepte | Wissensbeiträge | Ideen | Tags | Events
 * Each tab displays a count badge from type_counts.
 */
import { RESULT_TYPE_OPTIONS, RESULT_TYPE_CONFIG } from '@/schemas/search';

interface SearchTabsProps {
  /** Currently selected type filter(s). Empty = all types. */
  activeTypes: string[];
  /** Counts per type from the API response. */
  typeCounts: Record<string, number>;
  /** Callback when a tab is clicked. Empty array = "Alle". */
  onTypeChange: (types: string[]) => void;
  /** Total count across all types. */
  totalCount: number;
}

export function SearchTabs({ activeTypes, typeCounts, onTypeChange, totalCount }: SearchTabsProps) {
  const isAllActive = activeTypes.length === 0;

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      {/* "Alle" tab */}
      <button
        onClick={() => onTypeChange([])}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
          transition-colors duration-150
          ${isAllActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }
        `}
      >
        Alle
        <span className={`
          text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center
          ${isAllActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'}
        `}>
          {totalCount}
        </span>
      </button>

      {/* Type-specific tabs */}
      {RESULT_TYPE_OPTIONS.map((option) => {
        const count = typeCounts[option.value] ?? 0;
        const isActive = activeTypes.includes(option.value);
        const config = RESULT_TYPE_CONFIG[option.value];

        // Hide tabs with 0 results unless they're active
        if (count === 0 && !isActive) return null;

        return (
          <button
            key={option.value}
            onClick={() => {
              if (isActive) {
                // Remove this type from active types
                const newTypes = activeTypes.filter((t) => t !== option.value);
                onTypeChange(newTypes);
              } else {
                // Set only this type as active (single-select behavior)
                onTypeChange([option.value]);
              }
            }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
              transition-colors duration-150 border
              ${isActive
                ? `${config?.bgColor ?? 'bg-primary/10 border-primary/30'} ${config?.color ?? 'text-primary'}`
                : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
              }
            `}
          >
            <span className="material-symbols-outlined text-base">{option.icon}</span>
            {option.label}
            <span className={`
              text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center
              ${isActive ? 'bg-background/60' : 'bg-muted'}
            `}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
