import ErrorDisplay from '@/components/ErrorDisplay';

/**
 * Error of one section (food-page-states): inline, with "Erneut versuchen". The rest of the page
 * stays visible and usable.
 */
export default function SectionError({ title, error, onRetry }: { title: string; error?: Error | null; onRetry?: () => void }) {
  return <ErrorDisplay variant="inline" title={title} error={error ?? null} onRetry={onRetry} />;
}
