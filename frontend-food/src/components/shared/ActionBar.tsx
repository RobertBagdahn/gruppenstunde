import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  /** Secondary action, left (e.g. "Zurück"). */
  secondary?: ReactNode;
  /** The one primary action, right (e.g. "Weiter"). */
  primary?: ReactNode;
  className?: string;
}

/**
 * The footer of a flow, rendered once (food-page-shell): fixed to the bottom on phones, where it
 * replaces the bottom navigation, and part of the page from 768 px. Never render two of them.
 */
export default function ActionBar({ secondary, primary, className }: ActionBarProps) {
  return (
    <div
      data-print-hide
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3',
        'md:static md:mt-8 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0',
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 md:max-w-none">
        <div className="flex min-w-0 items-center">{secondary}</div>
        {primary && <div className="flex min-w-0 flex-1 justify-end md:flex-none [&>*]:w-full md:[&>*]:w-auto">{primary}</div>}
      </div>
    </div>
  );
}
