/**
 * Shared EmptyState — consistent empty state display with optional mascot, icon, and CTA.
 */
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/icon';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  mascotSrc?: string;
  mascotAlt?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  /** Icon of the button variant (`onCtaClick`); none by default. */
  ctaIcon?: string;
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
  ctaIcon,
}: EmptyStateProps) {
  return (
    <div className="animate-rise flex flex-col items-center justify-center rounded-xl bg-card px-6 py-14 text-center shadow-card">
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
        <div className="mb-5 flex h-20 w-20 -rotate-3 items-center justify-center rounded-xl bg-primary-soft">
          <Icon name={icon} size={48} className="text-primary" />
        </div>
      ) : null}
      <h2 className="font-display text-section font-extrabold text-foreground">{title}</h2>
      <p className="text-body text-muted-foreground mt-1 max-w-md">{description}</p>
      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="press inline-flex h-11 items-center gap-1.5 mt-5 px-5 bg-primary text-primary-foreground rounded-lg text-body font-semibold shadow-soft hover:bg-primary/90 transition-colors"
        >
          <Icon name="add" size={20} />
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaHref && (
        <button
          type="button"
          onClick={onCtaClick}
          className="press inline-flex h-11 items-center gap-1.5 mt-5 px-5 bg-primary-soft text-primary rounded-lg text-body font-semibold hover:bg-primary-soft-border/60 transition-colors"
        >
          {ctaIcon && <Icon name={ctaIcon} size={20} />}
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
