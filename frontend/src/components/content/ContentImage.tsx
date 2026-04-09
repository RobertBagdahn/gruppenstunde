import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  xs: 'w-8',
  sm: 'w-10',
  md: 'w-14',
  lg: 'w-16',
  xl: 'w-20',
  full: 'w-full',
} as const;

type ContentImageSize = keyof typeof SIZE_CLASSES;

interface ContentImageProps {
  src: string | null;
  alt: string;
  fallbackSrc?: string;
  size?: ContentImageSize;
  rounded?: string;
  className?: string;
}

export default function ContentImage({
  src,
  alt,
  fallbackSrc,
  size = 'full',
  rounded = 'rounded-lg',
  className,
}: ContentImageProps) {
  const resolvedSrc = src || fallbackSrc;

  return (
    <div
      className={cn(
        'aspect-square overflow-hidden',
        SIZE_CLASSES[size],
        rounded,
        className,
      )}
    >
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <span className="material-symbols-outlined text-muted-foreground/40 text-[24px]">
            image
          </span>
        </div>
      )}
    </div>
  );
}
