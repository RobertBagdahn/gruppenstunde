import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface AreaTab {
  label: string;
  to: string;
  /** Route prefixes that mark the tab as active. */
  activePrefixes: readonly string[];
}

/**
 * Tabs that switch between sibling sections of one area, e.g. Zutaten and Material
 * (food-frontend-app: Material under Zutaten). Links, so the state lives in the URL.
 */
export default function AreaTabs({ tabs, label, className }: { tabs: readonly AreaTab[]; label: string; className?: string }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label={label} className={cn('mb-4 inline-flex rounded-full bg-muted p-1', className)}>
      {tabs.map((tab) => {
        const active = tab.activePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'press flex h-11 items-center rounded-full px-4 text-body font-semibold transition-colors',
              active ? 'bg-background text-primary-dark shadow-soft' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
