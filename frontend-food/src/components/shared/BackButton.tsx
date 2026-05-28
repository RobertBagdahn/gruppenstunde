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
    'inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors',
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
      onClick={onClick ?? (() => navigate(-1))}
      className={classes}
    >
      <ChevronLeft className="w-4 h-4" />
      Zurück
    </button>
  );
}
