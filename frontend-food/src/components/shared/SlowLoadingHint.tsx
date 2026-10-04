/**
 * Shown under a skeleton when the first load takes longer than 3 seconds
 * (food-loading-states spec), e.g. while the server is cold-starting.
 */
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export const SLOW_LOADING_DELAY_MS = 3000;
export const SLOW_LOADING_TEXT = 'Dauert etwas länger – der Server startet gerade.';

export default function SlowLoadingHint({ delayMs = SLOW_LOADING_DELAY_MS }: { delayMs?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;
  return (
    <p className="section-enter mt-4 flex items-center justify-center gap-2 text-body text-muted-foreground">
      <Clock className="h-4 w-4" aria-hidden="true" />
      {SLOW_LOADING_TEXT}
    </p>
  );
}
