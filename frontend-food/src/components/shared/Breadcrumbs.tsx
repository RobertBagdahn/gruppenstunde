import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page (the last item). */
  to?: string;
}

/** Breadcrumbs above the H1 of list and detail pages (food-page-shell). Real links, last item marked. */
export default function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Brotkrumen" className={cn('text-body text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <li aria-hidden="true" className="text-symbol">
                  /
                </li>
              )}
              <li className="min-w-0" aria-current={last ? 'page' : undefined}>
                {item.to && !last ? (
                  <Link to={item.to} className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className={cn('[overflow-wrap:anywhere]', last && 'text-foreground')}>{item.label}</span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
