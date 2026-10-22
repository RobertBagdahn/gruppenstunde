import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Back pill named after its target, e.g. "Rezepte" (food-page-shell). */
  back?: { to: string; label: string };
  /** Key figures or other content directly under the title. */
  children?: ReactNode;
  /** Actions on the right (wrap below the title on small screens). */
  actions?: ReactNode;
  className?: string;
}

/** Header of a detail page: back pill, H1 and key figures. */
export default function DetailHeader({ title, description, back, children, actions, className }: DetailHeaderProps) {
  return (
    <header className={cn('mb-6 space-y-3 md:mb-8', className)}>
      {back && (
        <Link
          to={back.to}
          className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-primary-soft pl-3 pr-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="font-display text-title font-extrabold text-foreground [overflow-wrap:anywhere]">{title}</h1>
          {description && <div className="max-w-2xl text-emphasis text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
