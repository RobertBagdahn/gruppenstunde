/**
 * RecipeBadge — Shows recipe origin badge.
 *
 * - "verified" (green) = Inspi-verified system recipe
 * - "community" (blue) = Public community recipe
 * - "personal" (yellow) = Personal/private recipe
 */

interface RecipeBadgeProps {
  badge: string | null | undefined;
  className?: string;
}

const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  verified: {
    label: 'Inspi-verifiziert',
    bg: 'bg-primary/10 border border-primary/20',
    text: 'text-primary',
    icon: 'verified',
  },
  community: {
    label: 'Community',
    bg: 'bg-[hsl(var(--chart-3))]/10 border border-[hsl(var(--chart-3))]/20',
    text: 'text-[hsl(var(--chart-3))]',
    icon: 'group',
  },
  personal: {
    label: 'Mein Rezept',
    bg: 'bg-[hsl(var(--chart-2))]/10 border border-[hsl(var(--chart-2))]/20',
    text: 'text-[hsl(var(--chart-2))]',
    icon: 'person',
  },
};

export default function RecipeBadge({ badge, className = '' }: RecipeBadgeProps) {
  if (!badge) return null;

  const config = BADGE_CONFIG[badge];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${config.bg} ${config.text} ${className}`}
    >
      <span className="material-symbols-outlined text-[12px]">{config.icon}</span>
      {config.label}
    </span>
  );
}
