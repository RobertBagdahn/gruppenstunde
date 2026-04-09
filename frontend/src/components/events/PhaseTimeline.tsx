import { cn } from '@/lib/utils';
import type { EventPhase } from '@/schemas/event';

interface PhaseStep {
  phase: EventPhase;
  label: string;
  date?: string | null;
}

const PHASE_LABELS: Record<EventPhase, string> = {
  draft: 'Erstellt',
  pre_registration: 'Vor Anmeldephase',
  registration: 'Anmeldephase',
  pre_event: 'Vor dem Event',
  running: 'Event läuft',
  completed: 'Abgeschlossen',
};

const PHASE_COLORS: Record<EventPhase, { bg: string; border: string; text: string }> = {
  draft: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-600' },
  pre_registration: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700' },
  registration: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' },
  pre_event: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
  running: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700' },
  completed: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-500' },
};

const ALL_PHASES: EventPhase[] = [
  'draft',
  'pre_registration',
  'registration',
  'pre_event',
  'running',
  'completed',
];

function getPhaseIndex(phase: EventPhase): number {
  return ALL_PHASES.indexOf(phase);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

interface PhaseTimelineProps {
  currentPhase: EventPhase;
  registrationStart?: string | null;
  registrationDeadline?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
}

export default function PhaseTimeline({
  currentPhase,
  registrationStart,
  registrationDeadline,
  startDate,
  endDate,
  createdAt,
}: PhaseTimelineProps) {
  const currentIdx = getPhaseIndex(currentPhase);

  // Build visible steps — skip phases that have no associated dates
  const steps: PhaseStep[] = [
    { phase: 'draft', label: PHASE_LABELS.draft, date: createdAt },
  ];

  if (registrationStart) {
    steps.push({ phase: 'pre_registration', label: PHASE_LABELS.pre_registration, date: registrationStart });
    steps.push({ phase: 'registration', label: PHASE_LABELS.registration, date: registrationStart });
  }

  if (registrationDeadline || startDate) {
    steps.push({ phase: 'pre_event', label: PHASE_LABELS.pre_event, date: registrationDeadline || startDate });
  }

  if (startDate) {
    steps.push({ phase: 'running', label: PHASE_LABELS.running, date: startDate });
  }

  if (endDate) {
    steps.push({ phase: 'completed', label: PHASE_LABELS.completed, date: endDate });
  }

  return (
    <div>
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center gap-0">
        {steps.map((step, idx) => {
          const stepIdx = getPhaseIndex(step.phase);
          const isCurrent = step.phase === currentPhase;
          const isPast = stepIdx < currentIdx;
          const isFuture = stepIdx > currentIdx;
          const colors = PHASE_COLORS[step.phase];
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.phase} className="flex items-center">
              <div className="flex flex-col items-center min-w-[80px]">
                {/* Circle */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
                    isCurrent && `${colors.bg} ${colors.border} ring-2 ring-offset-1 ring-${colors.border.replace('border-', '')}`,
                    isPast && 'bg-green-500 border-green-500',
                    isFuture && 'bg-white border-gray-300',
                  )}
                >
                  {isPast && (
                    <span className="material-symbols-outlined text-white text-[16px]">check</span>
                  )}
                  {isCurrent && (
                    <div className={cn('w-2.5 h-2.5 rounded-full', colors.border.replace('border', 'bg'))} />
                  )}
                </div>
                {/* Label */}
                <span
                  className={cn(
                    'text-[10px] mt-1 text-center leading-tight font-medium',
                    isCurrent && colors.text,
                    isPast && 'text-green-600',
                    isFuture && 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
                {/* Date */}
                {step.date && (
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {formatDate(step.date)}
                  </span>
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'h-0.5 w-8 flex-shrink-0 -mt-5',
                    isPast ? 'bg-green-400' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="md:hidden space-y-0">
        {steps.map((step, idx) => {
          const stepIdx = getPhaseIndex(step.phase);
          const isCurrent = step.phase === currentPhase;
          const isPast = stepIdx < currentIdx;
          const isFuture = stepIdx > currentIdx;
          const colors = PHASE_COLORS[step.phase];
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.phase} className="flex gap-3">
              {/* Vertical connector + circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    isCurrent && `${colors.bg} ${colors.border}`,
                    isPast && 'bg-green-500 border-green-500',
                    isFuture && 'bg-white border-gray-300',
                  )}
                >
                  {isPast && (
                    <span className="material-symbols-outlined text-white text-[14px]">check</span>
                  )}
                  {isCurrent && (
                    <div className={cn('w-2 h-2 rounded-full', colors.border.replace('border', 'bg'))} />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'w-0.5 flex-1 min-h-[20px]',
                      isPast ? 'bg-green-400' : 'bg-gray-200',
                    )}
                  />
                )}
              </div>
              {/* Text */}
              <div className={cn('pb-3', isLast && 'pb-0')}>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isCurrent && colors.text,
                    isPast && 'text-green-600',
                    isFuture && 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {formatDate(step.date)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PHASE_LABELS, PHASE_COLORS };
