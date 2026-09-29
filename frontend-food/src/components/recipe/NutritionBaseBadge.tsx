interface NutritionBaseBadgeProps {
  base: 'per_100g' | 'per_portion' | 'total';
}

const BADGE_CONFIG = {
  per_100g: { label: 'pro 100g', className: 'bg-success-soft text-success' },
  per_portion: { label: 'pro Portion', className: 'bg-warning-soft text-warning' },
  total: { label: 'gesamt', className: 'bg-info-soft text-info' },
} as const;

export function NutritionBaseBadge({ base }: NutritionBaseBadgeProps) {
  const config = BADGE_CONFIG[base];
  return (
    <span
      className={`inline-block text-caption px-1.5 py-0.5 rounded-full font-medium leading-none ${config.className}`}
    >
      {config.label}
    </span>
  );
}
