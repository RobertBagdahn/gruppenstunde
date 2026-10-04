/**
 * Thin progress bar at the top edge while queries refetch in the background or
 * mutations run (food-loading-states spec). It appears after 150 ms so quick
 * requests do not flash.
 */
import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

const SHOW_DELAY_MS = 150;

export default function GlobalFetchingBar() {
  const busy = useIsFetching() + useIsMutating() > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      data-print-hide
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-full w-1/3 animate-[fetching-bar_1.1s_ease-in-out_infinite] rounded-full bg-primary-bright motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  );
}
