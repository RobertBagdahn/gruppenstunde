import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info';

const VARIANT: Record<StatusVariant, { box: string; icon: string; iconName: string }> = {
  success: { box: 'bg-success-soft border-success-border text-success', icon: 'text-success', iconName: 'check_circle' },
  warning: { box: 'bg-warning-soft border-warning-border text-warning', icon: 'text-warning', iconName: 'warning' },
  danger: { box: 'bg-danger-soft border-danger-border text-danger-foreground', icon: 'text-danger', iconName: 'error' },
  info: { box: 'bg-muted border-border text-foreground', icon: 'text-muted-foreground', iconName: 'info' },
};

/**
 * Status notice with surface, border and icon (food-design-system: Status nie nur Farbe).
 * Never used for recipe-type tints.
 */
export default function StatusNotice({ variant, children, className }: { variant: StatusVariant; children: ReactNode; className?: string }) {
  const style = VARIANT[variant];
  return (
    <div role={variant === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-xl border p-3 text-body', style.box, className)}>
      <Icon name={style.iconName} size={20} className={cn('mt-0.5 shrink-0', style.icon)} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
