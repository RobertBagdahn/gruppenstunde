type AmpelStatus = 'green' | 'yellow' | 'red';

interface MealPlanFilterChipsProps {
  ampelFilter: AmpelStatus | 'all';
  onAmpelChange: (ampel: AmpelStatus | 'all') => void;
  timeRange: 'this_week' | 'next_week' | 'next_month' | 'all';
  onTimeRangeChange: (range: 'this_week' | 'next_week' | 'next_month' | 'all') => void;
}

const AMPEL_CHIPS: { value: AmpelStatus | 'all'; label: string; dotClass: string }[] = [
  { value: 'all', label: 'Alle', dotClass: '' },
  { value: 'green', label: 'Bereit', dotClass: 'bg-emerald-500' },
  { value: 'yellow', label: 'In Arbeit', dotClass: 'bg-amber-500' },
  { value: 'red', label: 'Teilweise', dotClass: 'bg-red-500' },
];

const TIME_CHIPS: { value: 'this_week' | 'next_week' | 'next_month' | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'this_week', label: 'Diese Woche' },
  { value: 'next_week', label: 'Nächste Woche' },
  { value: 'next_month', label: 'Nächster Monat' },
];

export default function MealPlanFilterChips({
  ampelFilter,
  onAmpelChange,
  timeRange,
  onTimeRangeChange,
}: MealPlanFilterChipsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      {/* Ampel filter chips */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
          Status
        </span>
        {AMPEL_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => onAmpelChange(chip.value)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
              ampelFilter === chip.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            {chip.dotClass && (
              <span className={`w-2 h-2 rounded-full ${chip.dotClass}`} />
            )}
            {chip.label}
          </button>
        ))}
      </div>

      {/* Time range filter chips */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
          Zeitraum
        </span>
        {TIME_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => onTimeRangeChange(chip.value)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
              timeRange === chip.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
