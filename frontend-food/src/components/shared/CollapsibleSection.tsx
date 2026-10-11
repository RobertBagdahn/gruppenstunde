/**
 * Collapsible detail section (food-progressive-disclosure spec).
 *
 * The header shows a title, an optional icon and a short summary (e.g.
 * "12 Rezepte"). The content mounts only while open, so queries inside it
 * load on demand. The open state is remembered per `storageKey`.
 */
import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const STORAGE_PREFIX = 'food:section:';

function readOpen(storageKey: string | undefined, fallback: boolean): boolean {
  if (!storageKey) return fallback;
  try {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    return stored === null ? fallback : stored === '1';
  } catch {
    return fallback;
  }
}

function writeOpen(storageKey: string | undefined, open: boolean): void {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, open ? '1' : '0');
  } catch {
    // Storage unavailable (private mode): the default applies next time.
  }
}

interface CollapsibleSectionProps {
  title: string;
  /** Short info next to the title while collapsed, e.g. "12 Rezepte". */
  summary?: ReactNode;
  icon?: string;
  defaultOpen?: boolean;
  /** Remembers the open state per section type (not per entity). */
  storageKey?: string;
  /** Extra controls in the header (shown while open). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  summary,
  icon,
  defaultOpen = false,
  storageKey,
  actions,
  className,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => readOpen(storageKey, defaultOpen));
  const contentId = useId();

  const toggle = () => {
    setOpen((current) => {
      writeOpen(storageKey, !current);
      return !current;
    });
  };

  return (
    <section className={cn('rounded-xl bg-card shadow-card', className)}>
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:px-5"
        >
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon name={icon} size={20} />
            </span>
          )}
          <span className="font-display text-section font-extrabold text-foreground">{title}</span>
          {summary && !open && <span className="min-w-0 truncate text-body text-muted-foreground">{summary}</span>}
          <ChevronDown
            aria-hidden="true"
            className={cn('ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out', open && 'rotate-180')}
          />
        </button>
        {open && actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {open && (
        <div id={contentId} className="animate-in fade-in-0 slide-in-from-top-1 duration-300 px-4 pb-5 pt-2 md:px-5">
          {children}
        </div>
      )}
    </section>
  );
}
