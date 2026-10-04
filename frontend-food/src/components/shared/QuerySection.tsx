/**
 * One independently loading section (food-loading-states, food-error-presentation).
 *
 * Renders, in this order: the section's own skeleton while the first load runs,
 * an inline error with "Erneut versuchen" when it failed, an empty state when
 * the data is empty, otherwise the content with a short fade-in. The rest of
 * the page stays usable in every state.
 */
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import ErrorDisplay from '@/components/ErrorDisplay';
import SlowLoadingHint from '@/components/shared/SlowLoadingHint';
import SectionBoundary from '@/components/shared/SectionBoundary';

interface QuerySectionProps<T> {
  query: Pick<UseQueryResult<T>, 'data' | 'error' | 'isPending' | 'isError' | 'refetch'>;
  /** Skeleton in the shape of the content. */
  skeleton: ReactNode;
  /** Title of the inline error, e.g. "Rezepte konnten nicht geladen werden". */
  errorTitle: string;
  /** Returns true when the loaded data counts as empty. */
  isEmpty?: (data: T) => boolean;
  /** Rendered for empty data (usually an EmptyState or a short muted line). */
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

export default function QuerySection<T>({ query, skeleton, errorTitle, isEmpty, empty, children }: QuerySectionProps<T>) {
  if (query.isPending) {
    return (
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Wird geladen</span>
        {skeleton}
        <SlowLoadingHint />
      </div>
    );
  }
  if (query.isError) {
    return (
      <ErrorDisplay
        variant="inline"
        error={query.error instanceof Error ? query.error : null}
        title={errorTitle}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const data = query.data as T;
  if (isEmpty?.(data)) return <div className="section-enter">{empty ?? null}</div>;
  return (
    <SectionBoundary>
      <div className="section-enter">{children(data)}</div>
    </SectionBoundary>
  );
}
