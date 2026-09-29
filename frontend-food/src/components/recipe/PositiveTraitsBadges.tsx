import { Icon } from '@/components/ui/icon';
/**
 * Positive health trait badges for recipe detail page.
 * Renders green chips for positive nutritional properties.
 */

const TRAIT_CONFIG: Record<string, { icon: string; label: string }> = {
  high_fiber: { icon: "grain", label: "Ballaststoffreich" },
  high_protein: { icon: "fitness_center", label: "Eiweißreich" },
  low_salt: { icon: "water_drop", label: "Salzarm" },
  low_sat_fat: { icon: "favorite", label: "Fettarm (gesättigt)" },
  low_sugar: { icon: "block", label: "Zuckerarm" },
  balanced: { icon: "balance", label: "Ausgewogen" },
};

interface PositiveTraitsBadgesProps {
  traits: string[];
}

export function PositiveTraitsBadges({ traits }: PositiveTraitsBadgesProps) {
  if (traits.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {traits.map((trait) => {
        const config = TRAIT_CONFIG[trait];
        if (!config) return null;
        return (
          <span
            key={trait}
            className="bg-success-soft text-success border border-success-border rounded-full px-3 py-1 text-body flex items-center gap-1.5"
          >
            <Icon name={config.icon} size={16} />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}
