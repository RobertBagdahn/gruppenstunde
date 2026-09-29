import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const BADGE_CONFIG = {
  verified: { color: 'bg-success', label: 'Verifiziert' },
  community: { color: 'bg-warning', label: 'Community' },
  personal: { color: 'bg-info', label: 'Persönlich' },
  draft: { color: 'bg-danger', label: 'Entwurf' },
} as const;

interface RecipeBadgeProps {
  badge: 'verified' | 'community' | 'personal' | 'draft';
  showLabel?: boolean;
}

export default function RecipeBadge({ badge, showLabel = false }: RecipeBadgeProps) {
  const config = BADGE_CONFIG[badge];

  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5 text-caption">
        <span className={`w-2 h-2 rounded-full ${config.color} shrink-0`} />
        <span className="text-muted-foreground">{config.label}</span>
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`w-2.5 h-2.5 rounded-full ${config.color} shrink-0 cursor-default`} />
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="text-caption">{config.label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
