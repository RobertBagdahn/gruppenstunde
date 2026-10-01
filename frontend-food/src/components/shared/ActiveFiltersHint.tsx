import { FilterX } from 'lucide-react';

interface ActiveFiltersHintProps {
  activeCount: number;
  onReset: () => void;
}

/** Makes restored filters visible, especially on mobile where filters live in a drawer. */
export default function ActiveFiltersHint({ activeCount, onReset }: ActiveFiltersHintProps) {
  if (activeCount <= 0) return null;
  return (
    <div
      className="mb-3 flex items-center gap-2 text-body text-muted-foreground"
      data-testid="active-filters-hint"
      role="status"
    >
      <span>{activeCount} Filter aktiv</span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-medium text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <FilterX className="h-4 w-4" aria-hidden="true" />
        Zurücksetzen
      </button>
    </div>
  );
}
