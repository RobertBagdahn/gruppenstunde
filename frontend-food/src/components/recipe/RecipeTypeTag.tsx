import { Icon } from '@/components/ui/icon';
import { RECIPE_TINT_CLASSES, recipeTint, recipeTypeIcon, recipeTypeLabel } from '@/lib/recipeTypeStyle';
import { cn } from '@/lib/utils';

/** Recipe-type chip in the recipe's category tint (food-design-system). Renders nothing for blank types. */
export default function RecipeTypeTag({ type, className }: { type: string | null | undefined; className?: string }) {
  const tint = recipeTint(type);
  const label = recipeTypeLabel(type);
  if (!tint || !label) return null;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold',
        RECIPE_TINT_CLASSES[tint],
        className,
      )}
    >
      <Icon name={recipeTypeIcon(type)} size={16} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
