import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpHintProps {
  /** Short accessible name, e.g. "Was bedeutet Kinder-Score?" */
  label: string;
  children: ReactNode;
  className?: string;
}

/** Small info button that shows an explanation on hover, focus and tap. */
export function HelpHint({ label, children, className }: HelpHintProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            className={cn(
              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              className,
            )}
          >
            <Info className="h-4 w-4" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" collisionPadding={8} className="max-w-xs text-caption leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
