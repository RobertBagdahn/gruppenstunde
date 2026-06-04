/**
 * Shared ListPageHero — consistent gradient hero section for list pages.
 * Renders full-bleed with gradient, icon, title, description, optional mascot and count badge.
 */

interface ListPageHeroProps {
  title: string;
  description: string;
  icon: string;
  gradientClasses: string;
  mascotSrc?: string;
  mascotAlt?: string;
  totalCount?: number;
  countLabel?: string;
  countIcon?: string;
}

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
    <div className={`relative overflow-hidden rounded-2xl ${gradientClasses} p-6 md:p-8 mb-6 md:mb-8 shadow-lg`}>
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
          <div className="hidden sm:flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-2xl">
            <span className="material-symbols-outlined text-white text-3xl md:text-4xl">
              {icon}
            </span>
          </div>
        )}
        <div>
          <div className="flex items-center gap-3 mb-1">
            {mascotSrc && (
              <span className="material-symbols-outlined text-white/80 text-2xl sm:hidden">
                {icon}
              </span>
            )}
            <h1 className="text-2xl md:text-3xl font-extrabold text-white font-display">{title}</h1>
          </div>
          <p className="text-white/80 text-sm md:text-base max-w-2xl">{description}</p>
          {totalCount !== undefined && (
            <span className="inline-flex items-center gap-1.5 mt-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full px-4 py-1.5">
              <span className="material-symbols-outlined text-[18px]">
                {countIcon ?? icon}
              </span>
              {totalCount} {countLabel ?? 'Ergebnis'}{totalCount !== 1 ? (countLabel ? '' : 'se') : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
