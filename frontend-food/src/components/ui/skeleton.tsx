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

interface SkeletonProps {
  className?: string;
}

/** Base block: a muted, gently pulsing surface. */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-muted', className)} />;
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

/** Header of a detail page: title, subtitle and a row of key facts. */
export function SkeletonDetailHeader({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('space-y-4', className)}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="flex flex-wrap gap-3 pt-1">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-28 rounded-xl" />
        ))}
      </div>
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

/** Whole page: header plus content blocks (route fallback, detail pages). */
export function PageSkeleton({ label = 'Seite wird geladen', className }: { label?: string; className?: string }) {
  return (
    <LoadingRegion label={label} className={cn('container max-w-6xl space-y-6 py-6', className)}>
      <SkeletonDetailHeader />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SkeletonSection lines={5} />
          <SkeletonSection lines={3} />
        </div>
        <SkeletonSection lines={6} />
      </div>
      <SlowLoadingHint />
    </LoadingRegion>
  );
}
