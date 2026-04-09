/**
 * HealthTipCard — displays actionable tip text for yellow/red health rules.
 *
 * Only renders content for non-green evaluations.
 */
import type { CockpitEvaluation } from '@/schemas/cockpit';

interface HealthTipCardProps {
  evaluation: CockpitEvaluation;
}

export default function HealthTipCard({ evaluation }: HealthTipCardProps) {
  if (evaluation.status === 'green' || !evaluation.tip_text) {
    return null;
  }

  const isRed = evaluation.status === 'red';

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 flex items-start gap-2.5 ${
        isRed
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <span
        className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${
          isRed ? 'text-red-600' : 'text-yellow-600'
        }`}
      >
        {isRed ? 'warning' : 'info'}
      </span>
      <div className="min-w-0">
        <p
          className={`text-sm font-medium ${
            isRed ? 'text-red-800' : 'text-yellow-800'
          }`}
        >
          {evaluation.rule_name}
        </p>
        <p
          className={`text-sm mt-0.5 ${
            isRed ? 'text-red-700' : 'text-yellow-700'
          }`}
        >
          {evaluation.tip_text}
        </p>
      </div>
    </div>
  );
}
