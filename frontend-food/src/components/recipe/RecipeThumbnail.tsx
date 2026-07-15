import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const FALLBACK_IMAGE = '/images/inspi_cook.png';

type ThumbnailSize = 'xs' | 'sm' | 'lg' | 'md' | 'full';
type ThumbnailAspectRatio = 'square' | '16/9' | '4/3';

const SIZE_CLASSES: Record<Exclude<ThumbnailSize, 'md' | 'full'>, string> = {
  xs: 'w-10 h-10',
  sm: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const ASPECT_RATIO_CLASSES: Record<ThumbnailAspectRatio, string> = {
  square: 'aspect-square',
  '16/9': 'aspect-[16/9]',
  '4/3': 'aspect-[4/3]',
};

interface RecipeThumbnailProps {
  /** URL of the recipe's uploaded image, or null/undefined/empty if none. */
  imageUrl?: string | null;
  /** Recipe title, used as the image's alt text. */
  title: string;
  /**
   * Size variant. `xs`/`sm`/`lg` render a fixed-size square (MealSlot,
   * RecipeTableRow/ProfilePage). `md` fills the parent width and applies
   * `aspectRatio` (RecipeCard, grid layouts). `full` fills the parent width
   * with a max-height constraint (preview dialogs, import preview).
   */
  size?: ThumbnailSize;
  /** Aspect ratio used only when `size="md"`. Defaults to `square`. */
  aspectRatio?: ThumbnailAspectRatio;
  /** Disables `loading="lazy"` for above-the-fold usage. */
  eager?: boolean;
  /** Additional classes for the outer (relative) container. */
  className?: string;
  /** Additional classes for the `<img>` element itself. */
  imgClassName?: string;
  /** Optional overlay content (badges etc.), rendered inside the relative container. */
  children?: ReactNode;
}

/**
 * Shared recipe image + fallback component. Renders the recipe's uploaded
 * image with `object-cover`, or falls back to the Inspi placeholder image
 * with `object-contain` (never renders a broken `<img>` or an icon-only
 * fallback), keeping recipe image presentation consistent across the
 * Food-Frontend.
 */
export default function RecipeThumbnail({
  imageUrl,
  title,
  size = 'md',
  aspectRatio = 'square',
  eager = false,
  className,
  imgClassName,
  children,
}: RecipeThumbnailProps) {
  const hasImage = Boolean(imageUrl);
  const src = imageUrl || FALLBACK_IMAGE;

  const containerSizeClass =
    size === 'md'
      ? cn('w-full', ASPECT_RATIO_CLASSES[aspectRatio])
      : size === 'full'
        ? 'w-full max-h-[200px]'
        : SIZE_CLASSES[size];

  return (
    <div className={cn('relative overflow-hidden shrink-0', containerSizeClass, className)}>
      <img
        src={src}
        alt={title}
        loading={eager ? undefined : 'lazy'}
        className={cn(
          'w-full h-full',
          hasImage ? 'object-cover' : 'object-contain p-4 bg-muted/30',
          imgClassName,
        )}
      />
      {children}
    </div>
  );
}
