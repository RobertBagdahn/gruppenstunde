/**
 * Shared Pagination component — consistent numbered pagination across all list pages.
 * Supports numbered page buttons with ellipsis, prev/next arrows, and mobile-compact mode.
 */
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Compute which page numbers to show with ellipsis gaps.
 * Always shows first, last, current, and neighbors.
 */
function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  // Always show page 1
  pages.push(1);

  if (current > 3) {
    pages.push('ellipsis');
  }

  // Show range around current page
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  // Always show last page
  pages.push(total);

  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={cn('flex items-center justify-center gap-1.5 mt-8', className)}>
      {/* Previous button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => handlePageChange(currentPage - 1)}
        className="inline-flex items-center justify-center rounded-lg border border-border px-2.5 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Vorherige Seite"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>

      {/* Page numbers — hidden on mobile, shown on sm+ */}
      <div className="hidden sm:flex items-center gap-1">
        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 text-sm text-muted-foreground select-none"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => handlePageChange(page)}
              className={cn(
                'inline-flex items-center justify-center rounded-lg w-9 h-9 text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-muted text-muted-foreground'
              )}
              aria-label={`Seite ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      {/* Mobile compact: "Seite X von Y" */}
      <span className="sm:hidden text-sm text-muted-foreground px-3">
        Seite {currentPage} von {totalPages}
      </span>

      {/* Next button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => handlePageChange(currentPage + 1)}
        className="inline-flex items-center justify-center rounded-lg border border-border px-2.5 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Naechste Seite"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  );
}
