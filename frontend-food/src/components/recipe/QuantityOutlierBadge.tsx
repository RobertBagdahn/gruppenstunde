import { AlertTriangle } from 'lucide-react';
import type { QuantityOutlier } from '@/schemas/recipe';
import { cn } from '@/lib/utils';

/** Warning at a recipe line whose amount is far above the usual one (editors only). */
export default function QuantityOutlierBadge({ outlier, className }: { outlier: QuantityOutlier; className?: string }) {
  const danger = outlier.severity === 'danger';
  const label = outlier.kind === 'undivided' ? 'Nicht geteilt?' : 'Auffällige Menge';
  return (
    <span
      title={outlier.message}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 text-caption font-medium leading-5',
        danger ? 'border-danger-border bg-danger-soft text-danger' : 'border-warning-border bg-warning-soft text-warning',
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      <span className="sr-only">: {outlier.message}</span>
    </span>
  );
}
