// Order quantities on the allowed grid (BEM-03): 0, or a multiple of the step that is at least the minimum.
// The stepper only moves between allowed values, so no value is changed without notice.

export type Direction = 'up' | 'down';

export function isAllowedQuantity(quantity: number, step: number, minimum: number = step): boolean {
  if (quantity === 0) return true;
  return quantity >= minimum && quantity % step === 0;
}

/** The next allowed value in `direction`: 0 → one step (or the minimum), and one step down → 0. */
export function nextQuantity(current: number, direction: Direction, step: number, minimum: number = step): number {
  if (direction === 'up') return current === 0 ? minimum : current + step;
  if (current <= minimum) return 0;
  return current - step;
}
