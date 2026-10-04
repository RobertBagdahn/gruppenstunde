/**
 * The only place that renders a Nutri-Score (semantic-colors spec).
 *
 * Always uses the official colours of Santé publique France. Sizes:
 * - `sm`: list rows and autocomplete entries
 * - `md`: cards and header areas
 * - `scale`: the full A–E scale with the current class highlighted
 *
 * Charts take their fill colours from `nutriScoreFill()`.
 */
import { cn } from '@/lib/utils';
import {
  NUTRI_SCORE_COLORS_BY_LETTER,
  NUTRI_SCORE_LETTERS,
  type NutriScoreLetter,
} from '@/schemas/supply';

export const NUTRI_SCORE_MEANING: Record<NutriScoreLetter, string> = {
  A: 'Hervorragend',
  B: 'Gut',
  C: 'Ausreichend',
  D: 'Mäßig',
  E: 'Ungünstig',
};

const NEUTRAL_FILL = '#9CA3AF';

/** Normalise a class (1–5) or a letter to the Nutri-Score letter. */
export function nutriLetter(value: number | string | null | undefined): NutriScoreLetter | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return NUTRI_SCORE_LETTERS[value - 1] ?? null;
  const upper = value.trim().toUpperCase();
  return (NUTRI_SCORE_LETTERS as readonly string[]).includes(upper) ? (upper as NutriScoreLetter) : null;
}

/** Official fill colour for charts; neutral grey for unknown values. */
export function nutriScoreFill(value: number | string | null | undefined): string {
  const letter = nutriLetter(value);
  return letter ? NUTRI_SCORE_COLORS_BY_LETTER[letter].hex : NEUTRAL_FILL;
}

/** Text colour that is readable on `nutriScoreFill()`. */
export function nutriScoreTextFill(value: number | string | null | undefined): string {
  const letter = nutriLetter(value);
  return letter ? NUTRI_SCORE_COLORS_BY_LETTER[letter].textHex : '#FFFFFF';
}

interface NutriScoreBadgeProps {
  /** Nutri class (1 = A … 5 = E) or letter. */
  value: number | string | null | undefined;
  size?: 'sm' | 'md' | 'scale';
  /** Shown when there is no value; nothing by default. */
  emptyLabel?: string;
  className?: string;
}

const SIZE_CLASS = {
  sm: 'h-5 min-w-5 px-1 text-caption rounded-full',
  md: 'h-8 w-8 text-body rounded-full',
} as const;

export default function NutriScoreBadge({ value, size = 'sm', emptyLabel, className }: NutriScoreBadgeProps) {
  const letter = nutriLetter(value);

  if (size === 'scale') {
    return (
      <div
        role="img"
        aria-label={letter ? `Nutri-Score ${letter}: ${NUTRI_SCORE_MEANING[letter]}` : 'Nutri-Score unbekannt'}
        className={cn('inline-flex items-center', className)}
      >
        {NUTRI_SCORE_LETTERS.map((item, index) => {
          const colors = NUTRI_SCORE_COLORS_BY_LETTER[item];
          const active = item === letter;
          return (
            <span
              key={item}
              aria-hidden="true"
              className={cn(
                'flex items-center justify-center font-display font-extrabold transition-transform',
                colors.bg,
                colors.text,
                active
                  ? 'relative z-10 h-11 w-10 scale-110 rounded-lg text-section shadow-raised'
                  : cn('h-9 w-8 text-body', letter && 'opacity-60'),
                !active && index === 0 && 'rounded-l-lg',
                !active && index === NUTRI_SCORE_LETTERS.length - 1 && 'rounded-r-lg',
              )}
            >
              {item}
            </span>
          );
        })}
      </div>
    );
  }

  if (!letter) {
    return emptyLabel ? <span className={cn('text-caption text-muted-foreground', className)}>{emptyLabel}</span> : null;
  }

  const colors = NUTRI_SCORE_COLORS_BY_LETTER[letter];
  return (
    <span
      role="img"
      aria-label={`Nutri-Score ${letter}`}
      title={`Nutri-Score ${letter}: ${NUTRI_SCORE_MEANING[letter]}`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display font-extrabold leading-none',
        SIZE_CLASS[size],
        colors.bg,
        colors.text,
        className,
      )}
    >
      {letter}
    </span>
  );
}
