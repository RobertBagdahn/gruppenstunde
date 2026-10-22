import type { ReactNode } from 'react';
import { formatCount } from '@/lib/format';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/shared/Breadcrumbs';
import { cn } from '@/lib/utils';

interface CountLabel {
  one: string;
  other: string;
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Breadcrumbs above the H1 (food-page-shell). */
  breadcrumbs?: BreadcrumbItem[];
  /** Total number of items; `undefined` hides the badge. */
  count?: number;
  /** Shows a skeleton in place of the badge while the count loads. */
  countLoading?: boolean;
  countLabel?: CountLabel;
  /** Buttons on the right (wrap below the title on small screens). */
  actions?: ReactNode;
  /** Search bar and quick filters below the title (on the page ground, not on a band). */
  children?: ReactNode;
  className?: string;
}

const DEFAULT_COUNT_LABEL: CountLabel = { one: 'Ergebnis', other: 'Ergebnisse' };

/** Header of a list page: breadcrumbs, H1, description, count and actions on the white ground. */
export default function PageHeader({
  title,
  description,
  breadcrumbs,
  count,
  countLoading = false,
  countLabel = DEFAULT_COUNT_LABEL,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6 space-y-4 md:mb-8', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-title font-extrabold text-foreground">{title}</h1>
            {countLoading ? (
              <span aria-hidden="true" className="skeleton-shimmer h-7 w-24 rounded-full" />
            ) : count !== undefined ? (
              <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-body font-bold text-primary-dark tabular-nums">
                {formatCount(count)} {count === 1 ? countLabel.one : countLabel.other}
              </span>
            ) : null}
          </div>
          {description && <p className="max-w-2xl text-emphasis text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
