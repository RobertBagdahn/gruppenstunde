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
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: 'verified',
  },
  community: {
    label: 'Community',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: 'group',
  },
  personal: {
    label: 'Mein Rezept',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
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
