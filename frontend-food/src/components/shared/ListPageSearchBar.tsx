import { Link } from 'react-router-dom';

interface ListPageSearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  createLabel?: string;
  createHref?: string;
  onCreateClick?: () => void;
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
  gradientClasses = 'from-rose-500/5 via-pink-500/5 to-rose-500/5',
}: ListPageSearchBarProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className={`mb-4 md:mb-8 bg-gradient-to-r ${gradientClasses} rounded-2xl p-4 md:p-6 border border-border/30`}>
      <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto flex items-center gap-2">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-muted-foreground">
            search
          </span>
          <input
            type="search"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-background text-foreground placeholder:text-muted-foreground border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-[hsl(174,60%,41%)] text-white font-medium hover:shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
        {createLabel && createHref && (
          <Link
            to={createHref}
            className="shrink-0 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-[hsl(174,60%,41%)] text-white font-medium hover:shadow-lg transition-all hidden sm:flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="text-sm">{createLabel}</span>
          </Link>
        )}
        {createLabel && onCreateClick && !createHref && (
          <button
            type="button"
            onClick={onCreateClick}
            className="shrink-0 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-[hsl(174,60%,41%)] text-white font-medium hover:shadow-lg transition-all hidden sm:flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="text-sm">{createLabel}</span>
          </button>
        )}
      </form>
    </div>
  );
}
