import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { prefetch } from './AppHeader';
import { MAIN_NAV, isNavItemActive } from './nav-items';

/** Bottom bar below 768 px: the four sections with icon and short label, 44 px targets. */
export default function BottomNav() {
  const location = useLocation();
  return (
    <nav
      data-print-hide
      aria-label="Hauptnavigation mobil"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex h-16 items-stretch px-2">
        {MAIN_NAV.map((item) => {
          const active = isNavItemActive(item, location.pathname);
          return (
            <Link
              key={item.key}
              to={item.to}
              onTouchStart={() => prefetch(item.to)}
              aria-current={active ? 'page' : undefined}
              className="press flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1"
            >
              <span
                className={cn(
                  'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200',
                  active ? 'bg-primary-soft text-primary-dark' : 'text-muted-foreground',
                )}
              >
                <Icon name={item.icon} size={20} />
              </span>
              <span className={cn('text-caption leading-none', active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground')}>
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
