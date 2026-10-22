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
    'press shrink-0 h-14 px-5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary-dark transition-colors hidden sm:flex items-center gap-2';

  // Search sits under the page header, as a child of PageHeader.
  return (
    <form role="search" onSubmit={handleSubmit} className={`flex items-center gap-2 ${className || ''}`}>
      <div className="flex-1 relative min-w-0">
        <Icon name="search" size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
          className="h-14 w-full rounded-xl border-0 bg-card pl-12 pr-4 text-emphasis text-foreground shadow-raised placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-4 focus:ring-ring/50"
        />
      </div>
      <button
        type="submit"
        aria-label="Suchen"
        className="press shrink-0 h-14 w-14 rounded-xl bg-muted text-foreground hover:bg-primary-soft hover:text-primary-dark transition-colors flex items-center justify-center"
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
