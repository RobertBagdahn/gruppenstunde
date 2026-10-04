import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/icon';

interface ListPageSearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  createLabel?: string;
  createHref?: string;
  onCreateClick?: () => void;
  className?: string;
}

export default function ListPageSearchBar({
  placeholder,
  value,
  onChange,
  onSubmit,
  createLabel,
  createHref,
  onCreateClick,
  className,
}: ListPageSearchBarProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  const createClass =
    'shrink-0 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors hidden sm:flex items-center gap-1.5';

  // Search sits directly on the page background: no surrounding card (food-list-page-layout).
  return (
    <form onSubmit={handleSubmit} className={`mb-6 md:mb-8 flex items-center gap-2 ${className || ''}`}>
      <div className="flex-1 relative min-w-0">
        <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
          className="w-full pl-11 pr-4 py-2.5 rounded-full bg-card text-foreground placeholder:text-muted-foreground border border-border shadow-card focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all text-body"
        />
      </div>
      <button
        type="submit"
        aria-label="Suchen"
        className="shrink-0 h-11 w-11 rounded-full bg-primary-soft text-primary hover:bg-primary-soft-border/60 transition-colors flex items-center justify-center"
      >
        <Icon name="search" size={20} />
      </button>
      {createLabel && createHref && (
        <Link to={createHref} className={createClass}>
          <Icon name="add_circle" size={20} />
          <span className="text-body">{createLabel}</span>
        </Link>
      )}
      {createLabel && onCreateClick && !createHref && (
        <button type="button" onClick={onCreateClick} className={createClass}>
          <Icon name="add_circle" size={20} />
          <span className="text-body">{createLabel}</span>
        </button>
      )}
    </form>
  );
}
