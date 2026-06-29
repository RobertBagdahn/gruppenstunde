interface PortionSummary {
  id: number;
  weight_g: number | null;
  rank: number;
}

interface SmartDefault {
  portion_id: number;
  quantity: number;
}

/**
 * Selects the default portion for a recipe item.
 * The first portion (rank=1) is always the Normalportion/default.
 * 
 * Returns quantity=1 for normal portions, quantity=100 for g-base portions.
 */
export function selectDefaultPortion(portions: PortionSummary[]): SmartDefault | null {
  if (portions.length === 0) {
    return null;
  }

  // Portions should already be sorted by rank from the backend (rank asc)
  const defaultPortion = portions[0];

  // If it's the g-base portion (weight_g ≤ 1), use quantity=100; otherwise quantity=1
  const quantity = defaultPortion.weight_g != null && defaultPortion.weight_g <= 1 ? 100 : 1;

  return { portion_id: defaultPortion.id, quantity };
}

/**
 * DEPRECATED: Use selectDefaultPortion instead.
 * This function is kept for backward compatibility but should not be used in new code.
 */
export function selectSmartDefaultPortion(portions: PortionSummary[]): SmartDefault | null {
  return selectDefaultPortion(portions);
}
