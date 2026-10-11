/**
 * Logo: tomato tile with a cooking pot plus the wordmark (Feldküche).
 * Used in the navigation, the footer and the route loading state.
 */
import { CookingPot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  /** Hide the wordmark on very narrow screens. */
  compactOnMobile?: boolean;
  className?: string;
}

export default function BrandMark({ compactOnMobile = false, className }: BrandMarkProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-spice text-white transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-105">
        <CookingPot className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className={cn('font-display text-section font-extrabold tracking-tight', compactOnMobile && 'hidden min-[380px]:inline')}>
        Inspi Food
      </span>
    </span>
  );
}
