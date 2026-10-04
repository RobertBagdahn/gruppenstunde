/**
 * Light page header (food-list-page-layout, food-design-system specs).
 *
 * Large title on the page background, an icon tile in the area colour,
 * a muted description and a calm count badge. No coloured surface, no gradient.
 */
import type { ReactNode } from 'react';
import { formatCount } from '@/lib/format';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type PageArea = 'recipes' | 'ingredients' | 'planner' | 'shopping' | 'neutral';

const AREA_TILE: Record<PageArea, string> = {
  recipes: 'bg-area-recipes-soft text-area-recipes',
  ingredients: 'bg-area-ingredients-soft text-area-ingredients',
  planner: 'bg-area-planner-soft text-area-planner',
  shopping: 'bg-area-shopping-soft text-area-shopping',
  neutral: 'bg-muted text-muted-foreground',
};

export function areaTileClass(area: PageArea): string {
  return AREA_TILE[area];
}

interface CountLabel {
  one: string;
  other: string;
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  icon: string;
  area?: PageArea;
  /** Total number of items; `undefined` hides the badge. */
  count?: number;
  /** Shows a skeleton in place of the badge while the count loads. */
  countLoading?: boolean;
  countLabel?: CountLabel;
  /** Buttons on the right (wrap below the title on small screens). */
  actions?: ReactNode;
  /** Extra content under the description (e.g. the search bar). */
  children?: ReactNode;
  className?: string;
}

const DEFAULT_COUNT_LABEL: CountLabel = { one: 'Ergebnis', other: 'Ergebnisse' };

export default function PageHeader({
  title,
  description,
  icon,
  area = 'neutral',
  count,
  countLoading = false,
  countLabel = DEFAULT_COUNT_LABEL,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6 space-y-5 md:mb-8', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14', AREA_TILE[area])}>
            <Icon name={icon} size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-display text-title font-extrabold text-foreground">{title}</h1>
              {countLoading ? (
                <Skeleton className="h-6 w-24 rounded-full" />
              ) : count !== undefined ? (
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-0.5 text-body font-medium text-muted-foreground tabular-nums">
                  {formatCount(count)} {count === 1 ? countLabel.one : countLabel.other}
                </span>
              ) : null}
            </div>
            {description && <p className="mt-1 max-w-2xl text-body text-muted-foreground md:text-emphasis">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
