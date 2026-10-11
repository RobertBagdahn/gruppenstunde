import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Optional action element rendered on the right (e.g. delete button) */
  action?: React.ReactNode;
  /** `hero`: light text on the pine hero band. */
  tone?: 'page' | 'hero';
  className?: string;
}

export default function Breadcrumb({ items, action, tone = 'page', className }: BreadcrumbProps) {
  const onHero = tone === 'hero';
  return (
    <nav
      aria-label="Brotkrumen"
      className={cn(
        'flex min-w-0 items-center gap-2 text-body',
        onHero ? 'mb-5 text-hero-muted' : 'mb-6 text-muted-foreground',
        className,
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={cn('truncate font-semibold', onHero ? 'text-hero-foreground' : 'text-foreground')}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className={cn(
                  'whitespace-nowrap transition-colors',
                  onHero ? 'hover:text-hero-foreground' : 'hover:text-primary',
                )}
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
      {action && <div className="ml-auto">{action}</div>}
    </nav>
  );
}
