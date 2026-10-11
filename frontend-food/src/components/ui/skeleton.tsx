/**
 * Content-shaped skeletons (food-loading-states spec).
 *
 * Every loading area renders the shape of the content that will replace it:
 * cards, table rows, a detail header or a form. Full-page spinners and plain
 * "Laden…" texts are not used for content areas.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import SlowLoadingHint from '@/components/shared/SlowLoadingHint';
import HeroBand from '@/components/shared/HeroBand';

interface SkeletonProps {
  className?: string;
  /** Skeleton sits on the pine hero band. */
  onHero?: boolean;
}

/** Base block: a muted surface with a soft light sweep. */
export function Skeleton({ className, onHero = false }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('skeleton-shimmer rounded-lg', onHero && 'skeleton-on-hero', className)} />;
}

/** Wrapper that announces the loading state to assistive technology. */
function LoadingRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A few lines of text; the last one is shorter. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** One list card: image area, title and metadata row. */
export function SkeletonCard({ withImage = true, className }: { withImage?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('rounded-xl bg-card shadow-card overflow-hidden', className)}>
      {withImage && <Skeleton className="aspect-square w-full rounded-none" />}
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Grid of list cards, matching the list-page grid. */
export function SkeletonCardGrid({
  count = 8,
  withImage = true,
  className,
  label = 'Inhalte werden geladen',
}: {
  count?: number;
  withImage?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <LoadingRegion label={label}>
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
        {Array.from({ length: count }, (_, index) => (
          <SkeletonCard key={index} withImage={withImage} />
        ))}
      </div>
      <SlowLoadingHint />
    </LoadingRegion>
  );
}

/** Table-like rows (admin tabs, lists of entries). */
export function SkeletonTableRows({
  rows = 6,
  columns = 3,
  className,
  label = 'Einträge werden geladen',
}: {
  rows?: number;
  columns?: number;
  className?: string;
  label?: string;
}) {
  return (
    <LoadingRegion label={label} className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} aria-hidden="true" className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="grid flex-1 gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }, (_, column) => (
              <Skeleton key={column} className={cn('h-4', column === 0 ? 'w-3/4' : 'w-1/2')} />
            ))}
          </div>
        </div>
      ))}
      <SlowLoadingHint />
    </LoadingRegion>
  );
}

/** Header of a detail page on the hero band: breadcrumb, title, meta chips. */
export function SkeletonDetailHeader({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('space-y-5', className)}>
      <Skeleton onHero className="h-4 w-48" />
      <Skeleton onHero className="h-8 w-24 rounded-full" />
      <Skeleton onHero className="h-14 w-4/5 max-w-xl md:h-16" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} onHero className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/** Row of key-figure tiles that overlaps the hero band's lower edge. */
export function SkeletonKeyFigures({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-card shadow-float md:grid-cols-4', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2 bg-card p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A card-shaped section with a heading and a few lines. */
export function SkeletonSection({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('rounded-xl bg-card p-5 shadow-card space-y-4', className)}>
      <Skeleton className="h-5 w-40" />
      <SkeletonText lines={lines} />
    </div>
  );
}

/** Form: label + input pairs and a button row. */
export function SkeletonForm({ fields = 4, className, label = 'Formular wird geladen' }: { fields?: number; className?: string; label?: string }) {
  return (
    <LoadingRegion label={label} className={cn('space-y-5', className)}>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} aria-hidden="true" className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div aria-hidden="true" className="flex gap-3 pt-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-24" />
      </div>
      <SlowLoadingHint />
    </LoadingRegion>
  );
}

/**
 * Whole page: hero band with a title, key figures on its edge and content
 * blocks below (route fallback, detail pages). Same shape as the real pages,
 * so the switch to content does not jump.
 */
export function PageSkeleton({ label = 'Seite wird geladen', className }: { label?: string; className?: string }) {
  return (
    <LoadingRegion label={label} className={cn('mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8', className)}>
      <HeroBand pullUpClassName="" overlap>
        <SkeletonDetailHeader />
      </HeroBand>
      <div className="relative -mt-10 space-y-6 md:-mt-12">
        <SkeletonKeyFigures />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <SkeletonSection lines={5} />
            <SkeletonSection lines={3} />
          </div>
          <SkeletonSection lines={6} />
        </div>
      </div>
      <SlowLoadingHint />
    </LoadingRegion>
  );
}
