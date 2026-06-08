import { cn } from '@/lib/utils';

interface QualityScoreBadgeProps {
  score: number | null | undefined;
  className?: string;
}

const getAmpelColor = (score: number | null | undefined): string => {
  if (score == null) return 'bg-muted text-muted-foreground';
  if (score >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (score >= 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
};

const getAmpelLabel = (score: number | null | undefined): string => {
  if (score == null) return '–';
  if (score >= 80) return 'Gut';
  if (score >= 50) return 'Mittel';
  return 'Niedrig';
};

export default function QualityScoreBadge({ score, className }: QualityScoreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        getAmpelColor(score),
        className
      )}
      title={score != null ? `Datenqualität: ${score}/100` : 'Noch nicht bewertet'}
    >
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          score == null
            ? 'bg-muted-foreground'
            : score >= 80
              ? 'bg-emerald-500'
              : score >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
        )}
      />
      {getAmpelLabel(score)} {score != null ? `${score}%` : ''}
    </span>
  );
}
