import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';

import { PresentationSwitch } from '@/components/shared/PresentationSwitch';

import { NAVIGATION } from './navigation';

const formatCount = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export type SidebarProps = {
  /** ISO calendar week shown next to the brand, e.g. 42; null while unknown. */
  currentWeek: number | null;
  /** Badge counts keyed by `NavItem.badge.key`; missing keys render no badge. */
  badges?: Partial<Record<string, number>>;
  /** Page-specific filters (URL state). Rendered under the navigation. */
  filters?: ReactNode;
  filterTitle?: string;
  onResetFilters?: () => void;
  /** Page-specific view settings. */
  settings?: ReactNode;
  settingsTitle?: string;
  user: { name: string; role: string };
};

export function Sidebar({
  currentWeek,
  badges = {},
  filters,
  filterTitle = 'Filter',
  onResetFilters,
  settings,
  settingsTitle = 'Ansicht',
  user,
}: SidebarProps) {
  return (
    <aside
      aria-label="Navigation, Filter und Einstellungen"
      className="flex min-w-0 flex-[1_1_var(--sidebar-width)] flex-col border-r border-border bg-shell min-[880px]:grow-0"
    >
      <Link to="/" className="flex items-center gap-2.5 border-b border-border px-[18px] py-4 text-foreground no-underline">
        <BrandMark />
        <span className="font-bold tracking-[0.04em]">RÜBERT</span>
        <span className="ml-auto font-mono text-caption text-muted-foreground">KW {currentWeek ?? '–'}</span>
      </Link>

      <nav aria-label="Hauptnavigation" className="flex flex-col gap-px border-b border-border px-2.5 pb-3 pt-2.5">
        {NAVIGATION.map((group) => (
          <div key={group.label} className="flex flex-col gap-px">
            <span className="px-2.5 pb-1 pt-2.5 text-label uppercase text-muted-foreground">
              {group.label}
            </span>
            {group.items.map((item) => {
              const Icon = item.icon;
              const count = item.badge ? badges[item.badge.key] : undefined;
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex h-[34px] items-center gap-2.5 rounded-md px-2.5 text-dense font-medium no-underline ${
                      isActive
                        ? 'bg-row-active text-foreground-strong shadow-[inset_2px_0_0_hsl(var(--accent))]'
                        : 'text-foreground-2 hover:bg-panel hover:text-foreground-strong'
                    }`
                  }
                >
                  <Icon size={16} strokeWidth={2} aria-hidden />
                  {item.label}
                  {count !== undefined && count > 0 && (
                    <span
                      className={`ml-auto font-mono text-caption ${
                        item.badge?.tone === 'warn'
                          ? 'rounded-full bg-traffic-yellow px-1.5 text-background'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatCount.format(count)}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {filters && (
        <section aria-label={filterTitle} className="flex flex-col gap-3.5 border-b border-border px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-label uppercase text-muted-foreground">{filterTitle}</span>
            {onResetFilters && (
              <button type="button" onClick={onResetFilters} className="bg-transparent p-0 text-caption text-link">
                Zurücksetzen
              </button>
            )}
          </div>
          {filters}
        </section>
      )}

      {settings && (
        <section aria-label={settingsTitle} className="flex flex-col gap-2 border-b border-border px-[18px] py-4">
          <span className="text-label uppercase text-muted-foreground">{settingsTitle}</span>
          {settings}
        </section>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-border px-[18px] py-3">
        <PresentationSwitch />
      </div>

      <div className="flex items-center gap-2.5 border-t border-border px-[18px] py-3.5">
        <span className="grid size-7 flex-none place-items-center rounded-full bg-border text-caption font-semibold">
          {user.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-dense font-medium">{user.name}</div>
          <div className="text-caption text-muted-foreground">{user.role}</div>
        </div>
        <Link
          to="/settings"
          aria-label="Einstellungen"
          className="grid size-8 place-items-center rounded-md border border-border bg-panel text-foreground"
        >
          <SlidersHorizontal size={16} aria-hidden />
        </Link>
      </div>
    </aside>
  );
}

/** One labelled group inside the sidebar filter or settings area. */
export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

function BrandMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" rx="6" fill="hsl(var(--accent))" />
      <path
        d="M13 19c0-5 3-8 7-9-1 4-3 7-7 9Zm0 0c0-4-2-7-6-8 0 4 2 7 6 8Z"
        fill="none"
        stroke="hsl(var(--background))"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
