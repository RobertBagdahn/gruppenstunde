import { useIsStickerOwner } from '@/components/shared/StickerBoundary';
import { cn } from '@/lib/utils';

/**
 * Yellow sticker, tilted (food-design-system). Only the first sticker of a view renders as a
 * sticker; the others render as flat tags. Only the sticker and the logo may be tilted.
 */
export default function Sticker({ children, className }: { children: string; className?: string }) {
  const isOwner = useIsStickerOwner();
  if (!isOwner) return <FlatTag className={className}>{children}</FlatTag>;
  return (
    <span
      data-print-hide
      className={cn(
        '-rotate-3 inline-flex items-center rounded-lg bg-sticker px-2.5 py-1 text-caption font-extrabold text-foreground shadow-soft',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Plain tag used for everything that is not the view's sticker. */
export function FlatTag({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-caption font-semibold text-foreground', className)}>
      {children}
    </span>
  );
}
