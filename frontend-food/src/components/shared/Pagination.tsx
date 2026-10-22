/**
 * Shared pagination (food-design-system, food-seo-markup): every page is a real link to `?page=N`
 * that keeps the other query parameters, so crawlers and "back" work without JavaScript.
 * With `onPageChange` the click is handled in place (scroll to top), the href stays valid.
 */
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Optional in-place handler; the link itself still points at the page. */
  onPageChange?: (page: number) => void;
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

export default function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const location = useLocation();
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const pageHref = (page: number) => {
    const params = new URLSearchParams(location.search);
    params.set('page', String(page));
    return `${location.pathname}?${params.toString()}`;
  };

  const handleClick = (page: number) => (event: React.MouseEvent) => {
    if (!onPageChange) return;
    event.preventDefault();
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const arrowClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted';
  const disabledClass = 'pointer-events-none opacity-40';

  return (
    <nav aria-label="Seiten" className={cn('mt-8 flex items-center justify-center gap-1.5', className)}>
      <Link
        to={pageHref(Math.max(1, currentPage - 1))}
        onClick={handleClick(Math.max(1, currentPage - 1))}
        aria-label="Vorherige Seite"
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : undefined}
        className={cn(arrowClass, currentPage <= 1 && disabledClass)}
      >
        <Icon name="chevron_left" size={20} />
      </Link>

      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="select-none px-2 text-body text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={page}
              to={pageHref(page)}
              onClick={handleClick(page)}
              aria-label={`Seite ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-full text-body font-semibold tabular-nums transition-colors',
                page === currentPage ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {page}
            </Link>
          ),
        )}
      </div>

      {/* Phones: "Seite X von Y" instead of the page numbers */}
      <span className="px-3 text-body text-muted-foreground sm:hidden">
        Seite {currentPage} von {totalPages}
      </span>

      <Link
        to={pageHref(Math.min(totalPages, currentPage + 1))}
        onClick={handleClick(Math.min(totalPages, currentPage + 1))}
        aria-label="Nächste Seite"
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
        className={cn(arrowClass, currentPage >= totalPages && disabledClass)}
      >
        <Icon name="chevron_right" size={20} />
      </Link>
    </nav>
  );
}
