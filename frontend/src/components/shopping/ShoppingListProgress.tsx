/**
 * ShoppingListProgress — Progress bar showing checked/total items.
 */
import { cn } from '@/lib/utils';

interface ShoppingListProgressProps {
  checked: number;
  total: number;
  className?: string;
}

export default function ShoppingListProgress({
  checked,
  total,
  className,
}: ShoppingListProgressProps) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {checked} / {total} erledigt
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct === 100 ? 'bg-emerald-500' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
