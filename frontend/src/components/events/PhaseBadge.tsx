import { cn } from '@/lib/utils';
import type { EventPhase } from '@/schemas/event';
import { PHASE_LABELS, PHASE_COLORS } from '@/components/events/PhaseTimeline';

export function PhaseBadge({ phase }: { phase: EventPhase }) {
  const colors = PHASE_COLORS[phase];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
        colors.bg,
        colors.border,
        colors.text,
      )}
    >
      {PHASE_LABELS[phase]}
    </span>
  );
}
