interface NutritionBaseBadgeProps {
  base: 'per_100g' | 'per_portion' | 'total';
}

const BADGE_CONFIG = {
  per_100g: { label: 'pro 100g', className: 'bg-emerald-100 text-emerald-700' },
  per_portion: { label: 'pro Portion', className: 'bg-amber-100 text-amber-700' },
  total: { label: 'gesamt', className: 'bg-sky-100 text-sky-700' },
} as const;

export function NutritionBaseBadge({ base }: NutritionBaseBadgeProps) {
  const config = BADGE_CONFIG[base];
  return (
    <span
      className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none ${config.className}`}
    >
      {config.label}
    </span>
  );
}
