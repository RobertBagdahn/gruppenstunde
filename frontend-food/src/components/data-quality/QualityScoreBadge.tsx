import { cn } from '@/lib/utils';

interface QualityScoreBadgeProps {
  score: number | null | undefined;
  className?: string;
}

const getAmpelColor = (score: number | null | undefined): string => {
  if (score == null) return 'bg-muted text-muted-foreground';
  if (score >= 80) return 'bg-success-soft text-success';
  if (score >= 50) return 'bg-warning-soft text-warning';
  return 'bg-danger-soft text-danger';
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium',
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
              ? 'bg-success'
              : score >= 50
                ? 'bg-warning'
                : 'bg-danger'
        )}
      />
      {getAmpelLabel(score)} {score != null ? `${score}%` : ''}
    </span>
  );
}
