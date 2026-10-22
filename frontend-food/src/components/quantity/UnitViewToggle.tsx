import { cn } from '@/lib/utils';
import { useUnitViewMode } from '@/hooks/useUnitViewMode';

/** Page-wide switch between the stored units and grams for every amount (view only). */
export function UnitViewToggle({ className }: { className?: string }) {
  const [mode, setMode] = useUnitViewMode();
  return (
    <div role="group" aria-label="Mengen anzeigen in" className={cn('inline-flex rounded-lg bg-muted p-0.5 text-caption', className)}>
      {(
        [
          ['start', 'Einheiten'],
          ['grams', 'Alles in Gramm'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={cn(
            'min-h-11 md:min-h-0 px-2 py-1 rounded-lg transition-colors',
            mode === value ? 'bg-card text-foreground shadow-card font-medium' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
