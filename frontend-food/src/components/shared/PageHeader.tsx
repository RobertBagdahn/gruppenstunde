/**
 * Page header in the pine hero band (Feldküche, food-list-page-layout).
 *
 * Large display title on the band, an icon tile in the area tint, a light
 * description and a count pill. Search bars and quick filters go in as
 * children so they sit on the band too.
 */
import type { ReactNode } from 'react';
import { formatCount } from '@/lib/format';
import { Icon } from '@/components/ui/icon';
import HeroBand from '@/components/shared/HeroBand';
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
  /** Extra content under the description, on the band (search bar, quick filters). */
  children?: ReactNode;
  /** Pull-up offset when the page container pads differently than `py-4 md:py-8`. */
  pullUpClassName?: string;
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
  pullUpClassName,
  className,
}: PageHeaderProps) {
  return (
    <HeroBand pullUpClassName={pullUpClassName} className={cn('mb-6 md:mb-8', className)}>
      <header className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={cn(
                'hidden h-14 w-14 shrink-0 -rotate-3 items-center justify-center rounded-xl sm:flex',
                AREA_TILE[area],
              )}
            >
              <Icon name={icon} size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h1 className="font-display text-display font-extrabold text-hero-foreground">{title}</h1>
                {countLoading ? (
                  <span aria-hidden="true" className="skeleton-shimmer skeleton-on-hero h-7 w-24 rounded-full" />
                ) : count !== undefined ? (
                  <span className="animate-rise inline-flex items-center rounded-full bg-hero-soft px-3 py-1 text-body font-bold text-hero-foreground tabular-nums">
                    {formatCount(count)} {count === 1 ? countLabel.one : countLabel.other}
                  </span>
                ) : null}
              </div>
              {description && (
                <p className="mt-3 max-w-2xl text-emphasis text-hero-muted">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </header>
    </HeroBand>
  );
}
