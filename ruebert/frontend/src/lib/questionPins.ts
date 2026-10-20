// Register of open questions per screen element. A pin shows only in presentation mode (feedback spec).
// Keys name the element; values are the question IDs in knowledge/open-questions.

export const QUESTION_PINS = {
  roundingThreshold: 'Q-050',
  tranche: 'Q-044',
  planningWindow: 'Q-080',
  stockoutPhase: 'Q-101',
  salesAnomaly: 'Q-106',
  dataFindingBulk: 'Q-024',
} as const;

export type PinKey = keyof typeof QUESTION_PINS;
