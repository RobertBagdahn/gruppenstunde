/** Small lock marker for AI buttons that need a login (screen-reader text included). */
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AiLockBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">(Anmeldung erforderlich)</span>
    </span>
  );
}
