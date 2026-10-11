/**
 * Compact hero band for pages that sit outside the list/detail patterns
 * (profile, legal, forms). Renders full-bleed; place it above the page
 * container, not inside it.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import HeroBand from '@/components/shared/HeroBand';
import { cn } from '@/lib/utils';

interface TitleBandProps {
  title: ReactNode;
  description?: ReactNode;
  /** Back pill above the title. */
  back?: { to: string; label: string };
  /** Content on the right (avatar, actions). */
  aside?: ReactNode;
  /** Match the width of the page content below. */
  innerClassName?: string;
  className?: string;
}

export default function TitleBand({ title, description, back, aside, innerClassName, className }: TitleBandProps) {
  return (
    <HeroBand pullUpClassName="" innerClassName={cn('!pt-6 md:!pt-8', innerClassName)} className={cn('mb-6 md:mb-8', className)}>
      {back && (
        <Link
          to={back.to}
          className="press mb-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-hero-soft pl-3 pr-4 text-body font-semibold text-hero-foreground transition-colors hover:bg-hero-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0 space-y-3">
          <h1 className="font-display text-display font-extrabold text-hero-foreground [overflow-wrap:anywhere]">{title}</h1>
          {description && <div className="max-w-2xl text-emphasis text-hero-muted">{description}</div>}
        </div>
        {aside}
      </div>
    </HeroBand>
  );
}
