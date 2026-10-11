import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  /** `hero`: pill on the pine hero band. */
  tone?: 'page' | 'hero';
  className?: string;
}

export function BackButton({ to, onClick, tone = 'page', className }: BackButtonProps) {
  const navigate = useNavigate();

  const classes = cn(
    'press inline-flex shrink-0 items-center gap-1 text-body font-semibold transition-colors',
    tone === 'hero'
      ? 'h-10 rounded-full bg-hero-soft pl-2 pr-4 text-hero-foreground hover:bg-hero-foreground hover:text-foreground'
      : 'text-muted-foreground hover:text-foreground',
    className
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        <ChevronLeft className="w-4 h-4" />
        Zurück
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick ?? (() => navigate(-1))}
      className={classes}
    >
      <ChevronLeft className="w-4 h-4" />
      Zurück
    </button>
  );
}
