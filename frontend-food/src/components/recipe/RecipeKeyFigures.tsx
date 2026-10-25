/**
 * Key-figure strip under the recipe header:
 * costs, cost per portion, Nutri-Score, energy and popularity at a glance.
 * Numbers nudge (`animate-pop`) when the portion count changes them.
 */
import { Eye, Heart } from 'lucide-react';
import NutriScoreBadge, { NUTRI_SCORE_MEANING, nutriLetter } from '@/components/shared/NutriScoreBadge';
import { formatCount, formatEuro, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

interface RecipeKeyFiguresProps {
  totalPriceEur: number | null;
  pricePerPortionEur: number | null;
  portions: number;
  /** Nutri class (1 = A … 5 = E) or letter. */
  nutriClass: number | string | null | undefined;
  energyPerPortionKcal: number | null;
  weightPerPortionG: number | null;
  views: number;
  likes: number;
  className?: string;
}

function Figure({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-card px-5 py-4 shadow-card md:py-5', className)}>
      <span className="text-caption font-bold uppercase tracking-wider text-primary-dark">{label}</span>
      <div className="flex min-h-9 items-center">{children}</div>
      {hint && <span className="truncate text-caption text-foreground/70">{hint}</span>}
    </div>
  );
}

export default function RecipeKeyFigures({
  totalPriceEur,
  pricePerPortionEur,
  portions,
  nutriClass,
  energyPerPortionKcal,
  weightPerPortionG,
  views,
  likes,
  className,
}: RecipeKeyFiguresProps) {
  const letter = nutriLetter(nutriClass);
  const portionsLabel = portions === 1 ? '1 Portion' : `${formatCount(portions)} Portionen`;

  return (
    <section
      aria-label="Kennzahlen"
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-5',
        className,
      )}
    >
      <Figure label="Gesamtkosten" hint={`für ${portionsLabel}`}>
        <span key={`${totalPriceEur}`} className="animate-pop font-display text-metric font-extrabold text-foreground">
          {totalPriceEur != null ? formatEuro(totalPriceEur) : '– €'}
        </span>
      </Figure>
      <Figure label="Pro Portion" hint={weightPerPortionG != null ? `${formatNumber(weightPerPortionG, { maxDecimals: 0 })} g` : undefined}>
        <span className="font-display text-metric font-extrabold text-foreground">
          {pricePerPortionEur != null ? formatEuro(pricePerPortionEur) : '– €'}
        </span>
      </Figure>
      <Figure label="Nutri-Score" hint={letter ? NUTRI_SCORE_MEANING[letter] : 'noch nicht berechnet'}>
        {letter ? (
          <NutriScoreBadge value={letter} size="md" className="h-10 w-10 text-section" />
        ) : (
          <span className="font-display text-metric font-extrabold text-muted-foreground">–</span>
        )}
      </Figure>
      <Figure label="Energie" hint="pro Portion">
        <span className="font-display text-metric font-extrabold text-foreground">
          {energyPerPortionKcal != null ? formatNumber(energyPerPortionKcal, { maxDecimals: 0 }) : '–'}
          <span className="ml-1 text-emphasis font-bold">kcal</span>
        </span>
      </Figure>
      <Figure label="Beliebtheit" hint="Aufrufe · Likes" className="col-span-2 md:col-span-1">
        <span className="flex items-center gap-4 font-display text-section font-extrabold text-foreground">
          <span className="flex items-center gap-1.5">
            <Eye className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Aufrufe:</span>
            {formatCount(views)}
          </span>
          <span className="flex items-center gap-1.5">
            <Heart className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Likes:</span>
            {formatCount(likes)}
          </span>
        </span>
      </Figure>
    </section>
  );
}
