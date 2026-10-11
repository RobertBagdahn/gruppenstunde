/**
 * Pine hero band (Feldküche): continues the navigation colour into the page
 * title area and spans the full viewport width, even inside a centred page
 * container. Content below may overlap its lower edge (`overlap`).
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeroBandProps {
  children: ReactNode;
  /**
   * Pulls the band up to the navigation. The default matches list-page
   * containers with `py-4 md:py-8`; pass your own when the page pads differently.
   */
  pullUpClassName?: string;
  /** Extra bottom room so the next block can overlap the band's lower edge. */
  overlap?: boolean;
  className?: string;
  innerClassName?: string;
}

export default function HeroBand({
  children,
  pullUpClassName = '-mt-4 md:-mt-8',
  overlap = false,
  className,
  innerClassName,
}: HeroBandProps) {
  return (
    <div className={cn('full-bleed bg-hero text-hero-foreground', pullUpClassName, className)}>
      <div
        className={cn(
          'mx-auto max-w-7xl px-4 pt-5 sm:px-6 md:pt-8 lg:px-8',
          overlap ? 'pb-16 md:pb-20' : 'pb-8 md:pb-10',
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A block that sits on the lower edge of an `overlap` hero band. */
export function HeroOverlap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('relative -mt-10 md:-mt-12', className)}>{children}</div>;
}
