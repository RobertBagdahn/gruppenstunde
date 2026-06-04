import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardTable = React.forwardRef<HTMLDivElement, CardTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-3 w-full', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardTable.displayName = 'CardTable';

export interface DataCardRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  clickable?: boolean;
}

export const DataCardRow = React.forwardRef<HTMLDivElement, DataCardRowProps>(
  ({ className, children, clickable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-card text-card-foreground border border-border rounded-xl p-4 md:p-5',
          'shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_0_rgba(0,0,0,0.02)]',
          'flex flex-col md:flex-row md:items-center justify-between gap-4',
          'transition-all duration-200',
          clickable && 'hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.08)] cursor-pointer hover:border-primary/20',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DataCardRow.displayName = 'DataCardRow';
