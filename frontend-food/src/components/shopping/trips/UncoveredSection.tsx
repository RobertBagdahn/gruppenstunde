import { TriangleAlert } from 'lucide-react';
import { formatBaseAmount, UNCOVERED_REASON_LABELS } from './tripFormat';
import type { Hint, Uncovered } from '@/schemas/shoppingTrip';

interface UncoveredSectionProps {
  uncovered: Uncovered[];
  hints: Hint[];
  /** Names of the rules the hints refer to (rule id → ingredient or material). */
  ruleNames: Record<number, string>;
}

/** Demand no trip covers, plus the notes the allocation produced (rules after the meal, meals without time…). */
export default function UncoveredSection({ uncovered, hints, ruleNames }: UncoveredSectionProps) {
  if (uncovered.length === 0 && hints.length === 0) return null;
  return (
    <section aria-label="Nicht gedeckt und Hinweise" className="space-y-3 rounded-xl border border-warning-border bg-warning-soft p-4 text-warning">
      {uncovered.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 font-display text-emphasis font-bold">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            Nicht gedeckt
          </h3>
          <ul className="mt-2 space-y-1 text-body">
            {uncovered.map((entry) => (
              <li key={`${entry.meal_id}-${entry.kind}-${entry.subject_id}`} className="break-words">
                <span className="font-semibold">{entry.name}</span> · {formatBaseAmount(entry.quantity, entry.kind === 'material' ? 'Stück' : 'g')}
                {' '}({entry.meal_label}) – {UNCOVERED_REASON_LABELS[entry.reason]}
              </li>
            ))}
          </ul>
        </div>
      )}
      {hints.length > 0 && (
        <ul className="space-y-1 text-body" aria-label="Hinweise">
          {hints.map((hint, index) => {
            const subject = hint.rule_id !== null ? ruleNames[hint.rule_id] : undefined;
            return (
              <li key={`${hint.kind}-${hint.rule_id ?? hint.meal_id}-${index}`} className="break-words">
                {subject ? `${subject}: ` : ''}
                {hint.message}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
