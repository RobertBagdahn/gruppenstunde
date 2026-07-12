import { cn } from '@/lib/utils';

type DateRange = 'all' | '30d' | '90d' | 'year';

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  includeEmbeddings: boolean;
  onIncludeEmbeddingsChange: (include: boolean) => void;
}

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'Gesamte Zeit' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: '90d', label: 'Letzte 90 Tage' },
  { value: 'year', label: 'Dieses Jahr' },
];

export default function AiFilterBar({
  dateRange,
  onDateRangeChange,
  includeEmbeddings,
  onIncludeEmbeddingsChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {DATE_RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <label className={cn(
        'flex items-center gap-2 text-sm cursor-pointer select-none',
        'text-muted-foreground hover:text-foreground transition-colors',
      )}>
        <input
          type="checkbox"
          checked={includeEmbeddings}
          onChange={(e) => onIncludeEmbeddingsChange(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        inkl. Embeddings
      </label>
    </div>
  );
}
