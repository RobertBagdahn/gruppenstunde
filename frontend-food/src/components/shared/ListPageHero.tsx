/**
 * Shared ListPageHero — consistent gradient hero section for list pages.
 * Renders full-bleed with gradient, icon, title, description, optional mascot and count badge.
 */
import { formatCount } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

interface CountLabel {
  one: string;
  other: string;
}

interface ListPageHeroProps {
  title: string;
  description: string;
  icon: string;
  gradientClasses: string;
  mascotSrc?: string;
  mascotAlt?: string;
  totalCount?: number;
  countLabel?: CountLabel;
  countIcon?: string;
}

const DEFAULT_COUNT_LABEL: CountLabel = { one: 'Ergebnis', other: 'Ergebnisse' };

export default function ListPageHero({
  title,
  description,
  icon,
  gradientClasses,
  mascotSrc,
  mascotAlt,
  totalCount,
  countLabel,
  countIcon,
}: ListPageHeroProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${gradientClasses} p-6 md:p-8 mb-6 md:mb-8 shadow-lg`}>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 hidden md:block" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4 hidden md:block" />

      <div className="relative flex items-center gap-4">
        {mascotSrc ? (
          <img
            src={mascotSrc}
            alt={mascotAlt ?? title}
            className="h-20 md:h-28 w-auto drop-shadow-lg hidden sm:block"
          />
        ) : (
          <div className="hidden sm:flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-xl">
            <Icon name={icon} size={24} className="text-white" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-3 mb-1">
            {mascotSrc && (
              <Icon name={icon} size={24} className="text-white/80 sm:hidden" />
            )}
            <h1 className="text-title md:text-title font-extrabold text-white font-display">{title}</h1>
          </div>
          <p className="text-white/80 text-body md:text-emphasis max-w-2xl">{description}</p>
          {totalCount !== undefined && (
            <span className="inline-flex items-center gap-1.5 mt-2 bg-white/20 backdrop-blur-sm text-white text-body font-medium rounded-full px-4 py-1.5">
              <Icon name={countIcon ?? icon} size={20} />
              {formatCount(totalCount)} {totalCount === 1 ? (countLabel ?? DEFAULT_COUNT_LABEL).one : (countLabel ?? DEFAULT_COUNT_LABEL).other}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
