import { usePresentationMode } from '@/lib/presentation';

/** Sidebar switch for presentation mode: on shows the question pins, off hides them. */
export function PresentationSwitch() {
  const [on, set] = usePresentationMode();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => set(!on)}
      className="flex h-8 items-center justify-between rounded-md border border-border bg-panel px-2.5 text-dense text-foreground-2"
    >
      Präsentationsmodus
      <span aria-hidden className={`ml-2 inline-flex h-4 w-7 rounded-full p-0.5 ${on ? 'bg-accent' : 'bg-border-strong'}`}>
        <span className={`size-3 rounded-full bg-background transition-transform ${on ? 'translate-x-3' : ''}`} />
      </span>
    </button>
  );
}
