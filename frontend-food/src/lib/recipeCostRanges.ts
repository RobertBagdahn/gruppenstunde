/** Price-per-portion ranges offered by the recipe list filter. */
export const RECIPE_COST_RANGES = [
  { value: 'lt2', label: '< 2€', min: undefined, max: 2 },
  { value: '2-5', label: '2 – 5€', min: 2, max: 5 },
  { value: '5-10', label: '5 – 10€', min: 5, max: 10 },
  { value: 'gt10', label: '> 10€', min: 10, max: undefined },
] as const;

export type RecipeCostRange = (typeof RECIPE_COST_RANGES)[number]['value'];

export const RECIPE_COST_RANGE_VALUES = RECIPE_COST_RANGES.map((range) => range.value) as [
  RecipeCostRange,
  ...RecipeCostRange[],
];

/**
 * Bounds sent to the API for the selected ranges: the smallest lower and the
 * largest upper bound. A range without upper bound (> 10€) leaves it open.
 * Non-adjacent picks (< 2€ and 5 – 10€) therefore include the gap between them.
 */
export function costBounds(selected: readonly string[] | undefined): { costs_min?: number; costs_max?: number } {
  const ranges = RECIPE_COST_RANGES.filter((range) => selected?.includes(range.value));
  if (ranges.length === 0) return {};
  const lowers = ranges.map((range) => range.min);
  const uppers = ranges.map((range) => range.max);
  const costs_min = lowers.includes(undefined) ? undefined : Math.min(...(lowers as number[]));
  const costs_max = uppers.includes(undefined) ? undefined : Math.max(...(uppers as number[]));
  return {
    ...(costs_min !== undefined ? { costs_min } : {}),
    ...(costs_max !== undefined ? { costs_max } : {}),
  };
}

/** Price of one portion — the value the cost filter and every recipe card use. */
export function recipePricePerPortion(recipe: {
  cached_price_total?: number | null;
  portions?: number | null;
}): number | null {
  if (recipe.cached_price_total == null) return null;
  return recipe.cached_price_total / Math.max(recipe.portions ?? 1, 1);
}
