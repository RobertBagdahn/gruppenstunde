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
  gradientClasses?: string;
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
  gradientClasses: _gradientClasses,
}: ListPageSearchBarProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className={`mb-4 md:mb-8 bg-card border border-border rounded-xl p-4 md:p-5 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_0_rgba(0,0,0,0.02)] ${className || ''}`}>
      <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto flex items-center gap-2">
        <div className="flex-1 relative">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body"
          />
        </div>
        <button
          type="submit"
          aria-label="Suchen"
          className="shrink-0 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/95 hover:shadow-sm active:bg-primary/90 transition-all flex items-center justify-center"
        >
          <Icon name="search" size={20} />
        </button>
        {createLabel && createHref && (
          <Link
            to={createHref}
            className="shrink-0 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/95 hover:shadow-sm active:bg-primary/90 transition-all hidden sm:flex items-center gap-1.5"
          >
            <Icon name="add_circle" size={20} />
            <span className="text-body">{createLabel}</span>
          </Link>
        )}
        {createLabel && onCreateClick && !createHref && (
          <button
            type="button"
            onClick={onCreateClick}
            className="shrink-0 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/95 hover:shadow-sm active:bg-primary/90 transition-all hidden sm:flex items-center gap-1.5"
          >
            <Icon name="add_circle" size={20} />
            <span className="text-body">{createLabel}</span>
          </button>
        )}
      </form>
    </div>
  );
}
