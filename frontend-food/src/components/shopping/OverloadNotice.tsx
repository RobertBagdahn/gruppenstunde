import { Loader2 } from 'lucide-react';

/** Shown while the backend turns requests away; the list below keeps its last state (shopping-list-sharing). */
export default function OverloadNotice() {
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-body text-warning-foreground">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span>Gerade sind viele gleichzeitig dabei. Wir versuchen es gleich nochmal.</span>
    </div>
  );
}
