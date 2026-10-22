/**
 * Building blocks of the list filter sidebars (food-list-page-layout,
 * food-progressive-disclosure): borderless groups separated by spacing,
 * a "Weitere Filter" disclosure and the mobile toggle.
 */
import { useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { HelpHint } from '@/components/ui/help-hint';
import { cn } from '@/lib/utils';

export function FilterGroup({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {icon && <Icon name={icon} size={16} />}
        <span>{title}</span>
        {hint && <HelpHint label={`Was bedeutet ${title}?`}>{hint}</HelpHint>}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function FilterCheckbox({
  checked,
  onChange,
  icon,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  icon?: string;
  label: string;
}) {
  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body transition-colors hover:bg-primary-soft md:min-h-0 md:py-1.5',
        checked && 'font-medium text-primary-dark',
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 rounded-sm border-input accent-primary" />
      {icon && <Icon name={icon} size={16} />}
      {label}
    </label>
  );
}

export function FilterRadio({
  checked,
  onChange,
  name,
  icon,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  name: string;
  icon?: string;
  label: string;
}) {
  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body transition-colors hover:bg-primary-soft md:min-h-0 md:py-1.5',
        checked && 'font-medium text-primary-dark',
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-5 w-5 accent-primary" />
      {icon && <Icon name={icon} size={16} />}
      {label}
    </label>
  );
}

/** Collapsed "Weitere Filter" with the number of active hidden filters. */
export function MoreFilters({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(activeCount > 0);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 py-2 text-body font-medium text-foreground hover:bg-muted"
      >
        <span>
          Weitere Filter
          {activeCount > 0 && <span className="ml-1 text-primary-dark">({activeCount})</span>}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && <div className="section-enter mt-3 space-y-6">{children}</div>}
    </div>
  );
}

/** Sidebar shell: a "Filter (N)" toggle on small screens, borderless groups on desktop. */
export function FilterSidebar({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <aside className="w-full shrink-0 md:sticky md:top-20 md:max-h-[calc(100vh-5rem)] md:w-60 md:overflow-y-auto md:pr-2">
      <button
        type="button"
        onClick={() => setMobileOpen((current) => !current)}
        aria-expanded={mobileOpen}
        className="mb-2 flex h-11 w-full items-center justify-between gap-2 rounded-full bg-card px-4 text-body font-semibold shadow-card md:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          {activeCount > 0 ? `Filter (${activeCount})` : 'Filter'}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', mobileOpen && 'rotate-180')} aria-hidden="true" />
      </button>
      <div
        className={cn(
          'space-y-6 pb-4 md:block md:rounded-xl md:border md:border-line md:bg-card md:p-4',
          mobileOpen ? 'block rounded-xl border border-line bg-card p-4' : 'hidden',
        )}
      >
        {children}
      </div>
    </aside>
  );
}

/** Removable chip for an active filter. */
export function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary-soft px-3 text-body font-medium text-primary-dark transition-colors hover:bg-primary-soft-border/60 md:min-h-8 md:text-caption"
      aria-label={`Filter ${label} entfernen`}
    >
      {label}
      <Icon name="close" size={16} />
    </button>
  );
}
