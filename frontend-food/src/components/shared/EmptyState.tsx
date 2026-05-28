/**
 * Shared EmptyState — consistent empty state display with optional mascot, icon, and CTA.
 */
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  mascotSrc?: string;
  mascotAlt?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  mascotSrc,
  mascotAlt,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {mascotSrc ? (
        <img
          src={mascotSrc}
          alt={mascotAlt ?? title}
          className="w-32 h-32 md:w-40 md:h-40 object-contain mb-6 drop-shadow-md"
          loading="lazy"
          width={160}
          height={160}
        />
      ) : icon ? (
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
          <span className="material-symbols-outlined text-4xl text-muted-foreground">
            {icon}
          </span>
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaHref && (
        <button
          type="button"
          onClick={onCtaClick}
          className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
