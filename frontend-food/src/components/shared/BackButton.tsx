import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  className?: string;
}

export function BackButton({ to, onClick, className }: BackButtonProps) {
  const navigate = useNavigate();

  const classes = cn(
    'press inline-flex min-h-11 shrink-0 items-center gap-1 text-body font-semibold text-muted-foreground transition-colors hover:text-foreground',
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
