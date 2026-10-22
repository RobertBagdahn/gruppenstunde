/**
 * Logo: the Inspi mascot plus the wordmark (food-design-system: Maskottchen als Logo).
 * Used in the navigation, the footer and the route loading state.
 */
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  /** Hide the wordmark on very narrow screens. */
  compactOnMobile?: boolean;
  className?: string;
}

export default function BrandMark({ compactOnMobile = false, className }: BrandMarkProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      {/* The only tilted element besides stickers (see lint rule `food/design-tokens`). */}
      <img
        src="/images/inspi-logo.webp"
        width={40}
        height={40}
        alt=""
        aria-hidden="true"
        className="h-10 w-10 shrink-0 object-contain transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-105"
      />
      <span className={cn('font-display text-section font-extrabold tracking-tight', compactOnMobile && 'hidden min-[380px]:inline')}>
        Inspi Food
      </span>
    </span>
  );
}
